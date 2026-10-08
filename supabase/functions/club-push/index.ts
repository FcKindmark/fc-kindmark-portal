import {createClient} from "npm:@supabase/supabase-js@2.106.0";
import webpush from "npm:web-push@3.6.7";
import {validSubscription} from "./validation.ts";
const origins=new Set(["https://portal.fckindmark.se","https://app.fckindmark.se","https://fc-kindmark-portal-seven.vercel.app"]);
Deno.serve(async(req:Request)=>{
 const origin=req.headers.get("origin")||"";
 const headers={"Content-Type":"application/json","Access-Control-Allow-Origin":origins.has(origin)?origin:"https://portal.fckindmark.se","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type","Access-Control-Allow-Methods":"POST, OPTIONS","Vary":"Origin"};
 const reply=(status:number,body:unknown)=>new Response(JSON.stringify(body),{status,headers});
 if(req.method==="OPTIONS")return new Response(null,{status:204,headers});
 if(req.method!=="POST")return reply(405,{error:"Använd POST."});
 if(origin&&!origins.has(origin))return reply(403,{error:"Otillåten webbplats."});
 const db=createClient(Deno.env.get("SUPABASE_URL")!,Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,{auth:{persistSession:false,autoRefreshToken:false}});
 const incoming=req.headers.get("x-kindmark-push");
 try {
   // The worker uses a dedicated secret; all browser actions verify the user's JWT with Auth.
   let user;
   if(!incoming){
     const token=req.headers.get("Authorization")?.replace(/^Bearer\s+/i,"")||"";
     if(!token)return reply(401,{error:"Logga in igen."});
     const identity=await db.auth.getUser(token);
     if(identity.error||!identity.data.user||identity.data.user.is_anonymous)return reply(401,{error:"Logga in igen."});
     user=identity.data.user;
   }
   const {data:config,error:configError}=await db.rpc("club_push_config");
   if(configError||!config)return reply(503,{error:"Notifikationerna är inte klara ännu. Försök igen senare."});
   if(incoming&&incoming!==config.dispatchToken)return reply(401,{error:"Otillåten begäran."});
   const body=await req.json();
   async function send(s:{endpoint:string,p256dh:string,auth:string},payload:unknown){
     if(!validSubscription({endpoint:s.endpoint,keys:{p256dh:s.p256dh,auth:s.auth}}))return 400;
     const request=webpush.generateRequestDetails({endpoint:s.endpoint,keys:{p256dh:s.p256dh,auth:s.auth}},JSON.stringify(payload),{
       TTL:86400,urgency:"normal",vapidDetails:{subject:"mailto:portal@fckindmark.se",publicKey:config.publicKey,privateKey:config.privateKey}
     });
     const response=await fetch(request.endpoint,{method:request.method,headers:request.headers,body:request.body,signal:AbortSignal.timeout(8000),redirect:"error"});
     await response.body?.cancel();return response.status;
   }
   if(incoming){
     if(body.action==="health"){
       const probe=webpush.generateRequestDetails({endpoint:"https://fcm.googleapis.com/fcm/send/kindmark-internal-probe",keys:{p256dh:config.publicKey,auth:"AAAAAAAAAAAAAAAAAAAAAA"}},"{}",{vapidDetails:{subject:"mailto:portal@fckindmark.se",publicKey:config.publicKey,privateKey:config.privateKey}});
       return reply(200,{ready:probe.body.length>0,encrypted:probe.headers["Content-Encoding"]==="aes128gcm"});
     }
     if(body.action!=="dispatch")return reply(400,{error:"Ogiltig åtgärd."});
     const {data:jobs,error}=await db.rpc("club_claim_push");if(error)throw error;
     let sent=0;
     for(let i=0;i<(jobs||[]).length;i+=5){
       await Promise.all(jobs.slice(i,i+5).map(async(job:any)=>{
         let status=503;
         try{status=await send(job,{title:job.title||"FC Kindmark",body:job.target_url.includes("family=calls")?"Ny kallelse. Öppna och svara Kommer eller Kommer inte.":"Du har ett nytt meddelande i FC Kindmark.",url:job.target_url,tag:`kindmark-${job.job_id}`,userId:job.user_id});}catch{/* Retry without logging endpoint or member data. */}
         const result=await db.rpc("club_finish_push",{job:job.job_id,claim:job.lease_id,status});if(result.error)throw result.error;
         if([404,410].includes(status))await db.from("club_push_subscriptions").delete().eq("id",job.subscription_id);
         if(status>=200&&status<300)sent++;
       }));
     }
     return reply(200,{processed:jobs?.length||0,sent});
   }
   if(!user)return reply(401,{error:"Logga in igen."});
   if(body.action==="config"){
     const {data,error}=await db.from("club_push_subscriptions").select("endpoint").eq("user_id",user.id);if(error)throw error;
     return reply(200,{publicKey:config.publicKey,endpoints:(data||[]).map(s=>s.endpoint)});
   }
   if(body.action==="subscribe"){
     const s=body.subscription;
     if(!validSubscription(s))return reply(400,{error:"Ogiltig notifikationsprenumeration."});
     const {data:existing,error:lookup}=await db.from("club_push_subscriptions").select("id,user_id").eq("endpoint",s.endpoint).maybeSingle();if(lookup)throw lookup;
     if(existing&&existing.user_id!==user.id)return reply(409,{error:"Enheten är kopplad till ett annat konto. Logga ut från det kontot först, eller återställ notifikationsbehörigheten i enhetens inställningar."});
     const {count,error:countError}=await db.from("club_push_subscriptions").select("id",{head:true,count:"exact"}).eq("user_id",user.id);if(countError)throw countError;
     if(!existing&&(count||0)>=10)return reply(400,{error:"Högst tio enheter kan vara anslutna."});
     const {error}=await db.from("club_push_subscriptions").upsert({user_id:user.id,endpoint:s.endpoint,p256dh:s.keys.p256dh,auth:s.keys.auth,updated_at:new Date().toISOString()},{onConflict:"endpoint"});if(error)throw error;
     return reply(200,{enabled:true});
   }
   if(body.action==="unsubscribe"){
     const {error}=await db.from("club_push_subscriptions").delete().eq("user_id",user.id).eq("endpoint",String(body.endpoint||""));if(error)throw error;
     return reply(200,{enabled:false});
   }
   if(body.action==="test"){
     const {data:s,error}=await db.from("club_push_subscriptions").select("*").eq("user_id",user.id).eq("endpoint",String(body.endpoint||"")).maybeSingle();if(error)throw error;
     if(!s)return reply(400,{error:"Aktivera notifikationer på den här enheten först."});
     const status=await send(s,{title:"FC Kindmark",body:"Dina notifikationer fungerar!",url:"/",tag:"kindmark-test",userId:user.id});
     if([404,410].includes(status))await db.from("club_push_subscriptions").delete().eq("id",s.id);
     if(status<200||status>=300)return reply(502,{error:"Testet kunde inte levereras. Aktivera notifikationerna igen."});
     return reply(200,{sent:true});
   }
   return reply(400,{error:"Ogiltig åtgärd."});
 }catch{return reply(500,{error:"Notifikationerna kunde inte behandlas. Försök igen."});}
});
