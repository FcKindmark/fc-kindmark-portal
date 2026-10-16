import { createClient } from "npm:@supabase/supabase-js@2.106.0";
const origins=new Set(["https://portal.fckindmark.se","https://fc-kindmark-portal-seven.vercel.app"]);
Deno.serve(async(req:Request)=>{
 const origin=req.headers.get("origin")||"";
 const headers={"Content-Type":"application/json","Access-Control-Allow-Origin":origins.has(origin)?origin:"https://portal.fckindmark.se","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type","Access-Control-Allow-Methods":"POST, OPTIONS","Vary":"Origin"};
 const reply=(status:number,body:unknown)=>new Response(JSON.stringify(body),{status,headers});
 if(req.method==="OPTIONS")return new Response(null,{status:204,headers});
 if(req.method!=="POST")return reply(405,{error:"Använd POST."});
 if(origin&&!origins.has(origin))return reply(403,{error:"Otillåten webbplats."});
 const url=Deno.env.get("SUPABASE_URL")!;
 const service=createClient(url,Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,{auth:{persistSession:false,autoRefreshToken:false}});
 const caller=createClient(url,Deno.env.get("SUPABASE_ANON_KEY")!,{global:{headers:{Authorization:req.headers.get("authorization")||""}},auth:{persistSession:false,autoRefreshToken:false}});
 const {data:identity,error:authError}=await caller.auth.getUser();
 if(authError||!identity.user)return reply(401,{error:"Logga in igen."});
 if(identity.user.app_metadata?.club_role!=="admin")return reply(403,{error:"Endast administratörer kan hantera spelarkonton."});
 let createdId:string|null=null;
 try{
  const body=await req.json();
  const username=String(body.username||"").trim().toLowerCase();
  const password=String(body.password||"");
  const playerId=String(body.player_id||"");
  const action=body.action||"create";
  if(!/^[a-z0-9][a-z0-9._-]{2,31}$/.test(username)||password.length<8||password.length>128||!["create","reset"].includes(action))return reply(400,{error:"Användarnamn: 3–32 tecken (a–z, 0–9, punkt, bindestreck). Lösenord: minst 8 tecken."});
  const {data:player,error:playerError}=await caller.from("players").select("id,name,birth_year").eq("id",playerId).single();
  if(playerError||!player)return reply(404,{error:"Spelaren finns inte."});
  if(!Number.isInteger(player.birth_year)||player.birth_year<1900||player.birth_year>new Date().getFullYear())return reply(400,{error:"Ange spelarens födelseår först."});
  const email=username+"@players.login.fckindmark.se";
  const {data:existing,error:lookupError}=await service.from("profiles").select("id,role").eq("email",email).maybeSingle();
  if(lookupError)throw lookupError;
  if(action==="reset"){
   if(!existing||existing.role!=="player")return reply(400,{error:"Kontot kunde inte hittas för spelaren."});
   const {data:account,error}=await service.auth.admin.getUserById(existing.id);
   if(error||account.user?.app_metadata?.managed_player_id!==playerId)return reply(400,{error:"Kontot tillhör inte denna spelare."});
   const {data:link,error:linkError}=await caller.from("club_player_access").select("user_id").eq("player_id",playerId).eq("user_id",existing.id).maybeSingle();
   if(linkError||!link)return reply(400,{error:"Kontot är inte kopplat till spelaren."});
   const updated=await service.auth.admin.updateUserById(existing.id,{password});
   if(updated.error)throw updated.error;
   return reply(200,{username,message:"Nytt lösenord sparat. Lämna det till spelaren."});
  }
  if(existing)return reply(409,{error:"Användarnamnet är upptaget. Välj ett annat."});
  const {data:links,error:linksError}=await caller.from("club_player_access").select("user_id").eq("player_id",playerId);
  if(linksError)throw linksError;
  if(links?.length){
   const {data:profiles,error}=await service.from("profiles").select("id").in("id",links.map(l=>l.user_id)).eq("role","player");
   if(error)throw error;
   if(profiles?.length)return reply(409,{error:"Spelaren har redan ett eget konto. Använd återställning för ett administrerat konto."});
  }
  const {data:created,error:createError}=await service.auth.admin.createUser({email,password,email_confirm:true,user_metadata:{full_name:player.name},app_metadata:{managed_player_id:playerId,player_username:username}});
  if(createError||!created.user)throw createError||new Error("create");
  createdId=created.user.id;
  const {error:linkError}=await caller.rpc("club_link_player_account",{target:createdId,player:playerId,enabled:true});
  if(linkError)throw linkError;
  createdId=null;
  return reply(200,{username,message:"Spelarkontot är klart. Logga in med användarnamn och lösenord. Inget mejl behövs."});
 }catch{
  if(createdId)await service.auth.admin.deleteUser(createdId);
  return reply(400,{error:"Kontot kunde inte sparas. Kontrollera användarnamn och lösenord och försök igen."});
 }
});
