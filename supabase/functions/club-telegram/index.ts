import {createClient} from 'npm:@supabase/supabase-js@2.106.0';
import {privateUpdate,hashToken,randomSecret,telegramRequest} from './helpers.ts';
const db=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false,autoRefreshToken:false}});
const origins=new Set(['https://portal.fckindmark.se','https://app.fckindmark.se','https://fc-kindmark-portal-seven.vercel.app']);
const webhookUrl=`${Deno.env.get('SUPABASE_URL')}/functions/v1/club-telegram`;
async function rpc(name:string,args:Record<string,unknown>={}){const {data,error}=await db.rpc(name,args);if(error)throw new Error('Databasen kunde inte uppdateras.');return data;}
Deno.serve(async req=>{
 const origin=req.headers.get('origin')||'';
 const cors=origins.has(origin)?{'Access-Control-Allow-Origin':origin,'Vary':'Origin','Access-Control-Allow-Headers':'authorization,apikey,content-type,x-client-info','Access-Control-Allow-Methods':'POST,OPTIONS'}:{};
 const respond=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{...cors,'Content-Type':'application/json','Cache-Control':'no-store'}});
 if(req.method==='OPTIONS')return new Response(null,{status:origins.has(origin)?204:403,headers:cors});
 if(req.method!=='POST')return respond({error:'Ogiltig begäran.'},405);
 try {
 const raw=await req.text();if(raw.length>65536)return respond({error:'För stor begäran.'},413);
 const body=JSON.parse(raw);const config=await rpc('club_telegram_config');
 const webhookSecret=req.headers.get('x-telegram-bot-api-secret-token');
 if(webhookSecret){
   if(!config?.ready||webhookSecret!==config.webhookSecret)return respond({error:'Obehörig.'},401);
   const update=privateUpdate(body);if(!update)return respond({ok:true});
   const text=await rpc('club_telegram_update',{update_id:update.updateId,chat:update.chat,command:update.command,hash:update.token?await hashToken(update.token):null,action:update.action,answer:update.answer});
   if(text){
     if(update.callbackId)await telegramRequest(config.token,'answerCallbackQuery',{callback_query_id:update.callbackId,text:text.slice(0,200),show_alert:false});
     else await telegramRequest(config.token,'sendMessage',{chat_id:update.chat,text});
   }
   return respond({ok:true});
 }
 if(req.headers.has('x-kindmark-telegram')){
   if(!config?.ready||req.headers.get('x-kindmark-telegram')!==config.dispatchSecret||body.action!=='dispatch')return respond({error:'Obehörig.'},401);
   const jobs=await rpc('club_claim_telegram');
   // A small concurrent batch completes within the scheduled wake-up timeout.
   await Promise.all((jobs||[]).map(async(job:any)=>{
     const payloads=Array.isArray(job.payload)?job.payload:(job.payload?[job.payload]:[]);
     let result={status:410,retryAfter:120};
     for(const payload of payloads){
       result=await telegramRequest(config.token,'sendMessage',payload);
       if(result.status!==200)break;
     }
     await rpc('club_finish_telegram',{job:job.job_id,claim:job.lease_id,status:result.status,retry_seconds:result.retryAfter});
   }));
   return respond({processed:jobs?.length||0});
 }
 if(!origins.has(origin))return respond({error:'Obehörig.'},403);
 const authorization=req.headers.get('authorization')||'';
 if(!authorization.startsWith('Bearer '))return respond({error:'Logga in igen.'},401);
 const {data:{user},error}=await db.auth.getUser(authorization.slice(7));
 if(error||!user||user.is_anonymous)return respond({error:'Logga in igen.'},401);
 if(body.action==='status')return respond(await rpc('club_telegram_status',{uid:user.id}));
 if(body.action==='disconnect'){await rpc('club_telegram_disconnect',{uid:user.id});return respond({connected:false});}
 if(body.action==='connect'){
   if(!config?.ready)return respond({error:'Telegram har inte aktiverats av föreningen ännu.'},409);
   const token=randomSecret();await rpc('club_telegram_issue',{uid:user.id,hash:await hashToken(token)});
   return respond({url:`https://t.me/${config.username}?start=${token}`,expiresIn:600});
 }
 if(body.action==='setup'){
   if(user.app_metadata?.club_role!=='admin')return respond({error:'Endast administratörer kan aktivera boten.'},403);
   const token=typeof body.token==='string'?body.token.trim():'';
   if(!/^\d{5,20}:[A-Za-z0-9_-]{30,80}$/.test(token))return respond({error:'Kontrollera bot-token från BotFather.'},400);
   const bot=await telegramRequest(token,'getMe',{});
   if(!bot.ok||!bot.result?.is_bot||!bot.result?.username)return respond({error:'Bot-token kunde inte verifieras hos Telegram.'},400);
   // Save inactive first: no deliveries until the authenticated webhook is configured.
   const next={token,username:bot.result.username,webhookSecret:randomSecret(),dispatchSecret:randomSecret(),ready:false};
   await rpc('club_telegram_save_config',{config:next});
   const hook=await telegramRequest(token,'setWebhook',{url:webhookUrl,secret_token:next.webhookSecret,allowed_updates:['message','callback_query'],max_connections:5,drop_pending_updates:false});
   if(!hook.ok)return respond({error:'Boten sparades, men anslutningen kunde inte aktiveras. Försök igen.'},502);
   await rpc('club_telegram_save_config',{config:{...next,ready:true}});
   return respond({ready:true,bot:next.username});
 }
 return respond({error:'Ogiltig begäran.'},400);
 }catch{return respond({error:'Telegram kunde inte uppdateras. Försök igen.'},503);}
});
