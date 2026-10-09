import {createClient} from 'npm:@supabase/supabase-js@2.106.0';
import nodemailer from 'npm:nodemailer@7.0.10';
const db=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false,autoRefreshToken:false}});
const origins=new Set(['https://portal.fckindmark.se','https://app.fckindmark.se','https://fc-kindmark-portal-seven.vercel.app']);
async function rpc(name:string,args:Record<string,unknown>={}){const {data,error}=await db.rpc(name,args);if(error)throw new Error('Databasfel');return data;}
function transport(config:any){return nodemailer.createTransport({host:'send.one.com',port:465,secure:true,auth:{user:config.user,pass:config.password},connectionTimeout:6000,greetingTimeout:6000,socketTimeout:8000});}
Deno.serve(async(req)=>{
 const origin=req.headers.get('origin')||'';
 const cors=origins.has(origin)?{'Access-Control-Allow-Origin':origin,'Vary':'Origin','Access-Control-Allow-Headers':'authorization,apikey,content-type,x-client-info','Access-Control-Allow-Methods':'POST,OPTIONS'}:{};
 const reply=(data:unknown,status=200)=>new Response(JSON.stringify(data),{status,headers:{...cors,'Content-Type':'application/json','Cache-Control':'no-store'}});
 if(req.method==='OPTIONS')return new Response(null,{status:origins.has(origin)?204:403,headers:cors});
 if(req.method!=='POST')return reply({error:'Ogiltig begäran.'},405);
 try{
 const raw=await req.text();if(raw.length>8192)return reply({error:'För stor begäran.'},413);
 const body=JSON.parse(raw),config=await rpc('club_mail_config');
 if(req.headers.has('x-kindmark-mail')){
 if(!config?.ready||req.headers.get('x-kindmark-mail')!==config.dispatchSecret||body.action!=='dispatch')return reply({error:'Obehörig.'},401);
 const jobs=await rpc('club_claim_mail'),smtp=transport(config);
 try{for(const job of jobs||[]){let status=200;
 try{const sent=await smtp.sendMail({from:{name:'FC Kindmark',address:config.user},to:job.recipient,subject:job.subject,text:job.content+'\n\nFC Kindmark · Medlemsportalen\nhttps://portal.fckindmark.se/?family=messages&message='+job.job_id,messageId:'<'+job.job_id+'@fckindmark.se>'});if(!sent.accepted?.length)status=503;}
 catch(error){const code=Number(error?.responseCode);status=code===535?401:code>=500?400:503;}
 await rpc('club_finish_mail',{job:job.job_id,claim:job.lease_id,status});
 }}finally{smtp.close();}
 return reply({processed:jobs?.length||0});
 }
 if(!origins.has(origin))return reply({error:'Obehörig.'},403);
 const token=req.headers.get('authorization')||'';
 if(!token.startsWith('Bearer '))return reply({error:'Logga in igen.'},401);
 const {data:{user},error}=await db.auth.getUser(token.slice(7));
 if(error||!user)return reply({error:'Logga in igen.'},401);
 if(user.app_metadata?.club_role!=='admin')return reply({error:'Endast administratör.'},403);
 if(body.action==='status')return reply({ready:!!config?.ready,user:config?.user||'portal@fckindmark.se'});
 if(body.action!=='setup')return reply({error:'Ogiltig åtgärd.'},400);
 const address=String(body.user||'').trim().toLowerCase(),password=String(body.password||'');
 if(!/^[a-z0-9._+-]+@fckindmark\.se$/.test(address)||!password||password.length>1024)return reply({error:'Ange klubbens e-postadress och lösenordet för e-postkontot.'},400);
 const next={user:address,password,ready:true,dispatchSecret:config?.dispatchSecret||crypto.randomUUID()+crypto.randomUUID()};
 const smtp=transport(next);try{await smtp.verify();}catch{return reply({error:'Kunde inte ansluta till one.com. Kontrollera e-postkontots lösenord.'},400);}finally{smtp.close();}
 await rpc('club_mail_save_config',{config:next});return reply({ready:true,user:address});
 }catch{return reply({error:'Utskicket kunde inte hanteras. Försök igen.'},500);}
});
