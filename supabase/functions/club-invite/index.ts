import { createClient } from "npm:@supabase/supabase-js@2.106.0";

const origins = new Set(["https://portal.fckindmark.se", "https://fc-kindmark-portal-seven.vercel.app"]);
Deno.serve(async (req: Request) => {
  const origin = req.headers.get("origin") || "";
  const headers = {"Content-Type":"application/json", "Access-Control-Allow-Origin":origins.has(origin)?origin:"https://portal.fckindmark.se", "Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type", "Access-Control-Allow-Methods":"POST, OPTIONS", "Vary":"Origin"};
  const reply = (status:number, body:unknown) => new Response(JSON.stringify(body), {status, headers});
  if (req.method === "OPTIONS") return new Response(null,{status:204,headers});
  if (req.method !== "POST") return reply(405,{error:"Använd POST."});
  if (origin && !origins.has(origin)) return reply(403,{error:"Otillåten webbplats."});
  const auth = req.headers.get("Authorization") || "";
  const url = Deno.env.get("SUPABASE_URL")!;
  const service = createClient(url,Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,{auth:{persistSession:false,autoRefreshToken:false}});
  const caller = createClient(url,Deno.env.get("SUPABASE_ANON_KEY")!,{global:{headers:{Authorization:auth}},auth:{persistSession:false,autoRefreshToken:false}});
  const {data:identity,error:authError} = await caller.auth.getUser();
  if(authError || !identity.user) return reply(401,{error:"Logga in igen."});
  if(identity.user.app_metadata?.club_role !== "admin") return reply(403,{error:"Endast administratörer kan bjuda in konton."});
  try {
    const body = await req.json();
    const email = String(body.email||"").trim().toLowerCase();
    const kind = body.kind || "parent";
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length>254 || !["parent","player","member"].includes(kind)) return reply(400,{error:"Ange en giltig e-postadress och kontotyp."});
    if(kind !== "member" && !body.player_id) return reply(400,{error:"Välj spelare."});
    if(body.player_id) {
      const {data,error}=await caller.from("players").select("id").eq("id",body.player_id).single();
      if(error || !data) return reply(404,{error:"Spelaren finns inte."});
    }
    if(body.card_id) {
      const {data,error}=await caller.from("club_member_cards").select("id").eq("id",body.card_id).single();
      if(error || !data) return reply(404,{error:"Medlemskortet finns inte."});
    }
    const {data:profile,error:lookupError}=await service.from("profiles").select("id,role").ilike("email",email.replace(/[\\%_]/g, "\\$&")).maybeSingle();
    if(lookupError) throw lookupError;
    let userId=profile?.id;
    let sent=false;
    if(userId && kind==="player" && ["admin","coach"].includes(profile.role)) return reply(409,{error:"Använd ett separat spelarkonto."});
    if(!userId) {
      const invited=await service.auth.admin.inviteUserByEmail(email,{redirectTo:"https://portal.fckindmark.se/?recovery=1",data:{full_name:String(body.name||"").slice(0,150)}});
      if(invited.error) throw invited.error;
      userId=invited.data.user.id; sent=true;
    } else if(body.resend === true) {
      const account=await service.auth.admin.getUserById(userId);
      if(account.error) throw account.error;
      if(!account.data.user.email_confirmed_at) {
        const invited=await service.auth.admin.inviteUserByEmail(email,{redirectTo:"https://portal.fckindmark.se/?recovery=1"});
        if(invited.error) throw invited.error;
        sent=true;
      }
    }
    if(kind==="player") {
      const {error}=await caller.rpc("club_link_player_account",{target:userId,player:body.player_id,enabled:true});
      if(error) throw error;
    } else if(body.player_id) {
      const {error}=await caller.from("club_player_access").upsert({user_id:userId,player_id:body.player_id},{onConflict:"user_id,player_id",ignoreDuplicates:true});
      if(error) throw error;
    }
    if(body.card_id) {
      const {data,error}=await caller.from("club_member_cards").update({user_id:userId}).eq("id",body.card_id).select("id");
      if(error || !data?.length) throw error || new Error("Medlemskortet kunde inte kopplas.");
    }
    return reply(200,{user_id:userId,sent,message:sent?"Välkomstmejl skickat. Mottagaren väljer lösenord via länken.":"Det befintliga kontot är kopplat. Logga in med det vanliga lösenordet."});
  } catch(error) {
    console.error("club-invite failed",error instanceof Error ? error.message : "unknown error");
    return reply(400,{error:"Kontot eller kopplingen kunde inte slutföras. Kontrollera e-postadressen och försök igen. Om mejlet redan skickats kan kontot kopplas utan en ny inbjudan."});
  }
});
