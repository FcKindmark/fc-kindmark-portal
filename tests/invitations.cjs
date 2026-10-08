const fs=require('fs'),assert=require('node:assert/strict'),babel=require('next/dist/compiled/babel/core');
const source=fs.readFileSync('supabase/functions/club-invite/index.ts','utf8');
const code=babel.transformSync(source,{filename:'index.ts',configFile:false,babelrc:false,presets:[require('next/dist/compiled/babel/preset-typescript')],plugins:[require('next/dist/compiled/babel/plugin-transform-modules-commonjs')]}).code;
async function run(body,{role='admin',authenticated=true,existing=false,confirmed=true,method='POST'}={}){
 let handler;const calls=[];
 const chain={select(){return this},eq(){return this},ilike(){return this},maybeSingle:async()=>({data:existing?{id:'existing-user',role:'parent'}:null}),single:async()=>({data:{id:'record'}}),upsert:async value=>{calls.push(['link',value]);return {}},update:()=>({eq:()=>({select:async()=>({data:[{id:'card'}]})})})};
 const caller={auth:{getUser:async()=>({data:{user:authenticated?{app_metadata:{club_role:role}}:null}})},from:()=>chain,rpc:async(name)=>{calls.push([name]);return {}}};
 const service={from:()=>chain,auth:{admin:{inviteUserByEmail:async(email,options)=>{calls.push(['invite',email,options]);return {data:{user:{id:'new-user'}}}},getUserById:async()=>({data:{user:{email_confirmed_at:confirmed?'date':null}}})}}};
 const createClient=(_,key)=>key==='service'?service:caller;
 const deno={serve:fn=>handler=fn,env:{get:key=>key==='SUPABASE_SERVICE_ROLE_KEY'?'service':'anon'}};
 new Function('require','Deno',code)(()=>({createClient}),deno);
 const response=await handler(new Request('https://edge.test',{method,headers:{'Authorization':'Bearer mock','Origin':'https://portal.fckindmark.se','Content-Type':'application/json'},body:method==='POST'?JSON.stringify(body):undefined}));
 return {status:response.status,data:await response.json(),calls};
}
(async()=>{
 const body={email:' Parent@Example.com ',kind:'parent',player_id:'player'};
 let r=await run(body,{authenticated:false});assert.equal(r.status,401);assert.equal(r.calls.length,0);
 r=await run(body,{role:'coach'});assert.equal(r.status,403);assert.equal(r.calls.length,0);
 r=await run({...body,email:'bad'});assert.equal(r.status,400);assert.equal(r.calls.length,0);
 r=await run(body);assert.equal(r.status,200);assert.equal(r.data.sent,true);assert.deepEqual(r.calls.map(c=>c[0]),['invite','link']);assert.equal(r.calls[0][1],'parent@example.com');assert.equal(r.calls[0][2].redirectTo,'https://portal.fckindmark.se/?invite=1');
 r=await run({...body,resend:true},{existing:true});assert.equal(r.data.sent,false);assert.deepEqual(r.calls.map(c=>c[0]),['link']);
 r=await run({...body,resend:true},{existing:true,confirmed:false});assert.equal(r.data.sent,true);
 r=await run({...body,kind:'player'});assert.deepEqual(r.calls.map(c=>c[0]),['invite','club_link_player_account']);
 console.log('PASS: invitations require verified admin, validate input, connect existing accounts without duplicate mail, resend pending invites, and preserve player RPC checks.');
})().catch(e=>{console.error(e);process.exit(1)});
