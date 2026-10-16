import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import {readFileSync} from "node:fs";
import {stripTypeScriptTypes} from "node:module";
const source=stripTypeScriptTypes(readFileSync(new URL("../supabase/functions/club-player-login/index.ts",import.meta.url),"utf8").replace(/^import .*\n/,""));
async function run(options={}){
 let handler,created=0,deleted=0,updated=0,linked=0;
 const result=(data,error=null)=>({data,error});
 const profile=options.profile||null;
 const query=table=>{
  const q={select(){return q},eq(k,v){q[k]=v;return q},in(){return q},maybeSingle:async()=>result(table==="profiles"?profile:options.link||null),single:async()=>result({id:"child",name:"Test",birth_year:2016}),then(resolve){resolve(result(table==="club_player_access"?(options.links||[]):[]))}};
  return q;
 };
 const service={from:query,auth:{admin:{
  createUser:async()=>{created++;return result({user:{id:"new"}})},
  deleteUser:async()=>{deleted++;return result({})},
  getUserById:async()=>result({user:{app_metadata:{managed_player_id:options.accountChild||"child"}}}),
  updateUserById:async()=>{updated++;return result({})}
 }}};
 const caller={from:query,auth:{getUser:async()=>options.noAuth?result({user:null},{message:"no"}):result({user:{app_metadata:{club_role:options.role||"admin"}}})},rpc:async()=>{linked++;return result(null,options.linkFails?{message:"fail"}:null)}};
 let clients=0;
 vm.runInNewContext(source,{Request,Response,Set,Number,String,Date,Error,JSON,Deno:{env:{get:()=>""},serve:fn=>handler=fn},createClient:()=>clients++===0?service:caller});
 const response=await handler(new Request("https://example.test",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({username:"test.player",password:"long-password-123",player_id:"child",...options.body})}));
 return {status:response.status,body:await response.json(),created,deleted,updated,linked};
}
test("unauthenticated and non-admin callers cannot create accounts",async()=>{
 for(const options of [{noAuth:true},{role:"parent"},{role:"coach"}]){const r=await run(options);assert.ok([401,403].includes(r.status));assert.equal(r.created,0);}
});
test("managed account for younger player is linked without email invitation",async()=>{const r=await run();assert.equal(r.status,200);assert.equal(r.created,1);assert.equal(r.linked,1);});
test("invalid usernames and short passwords cannot create accounts",async()=>{for(const body of [{username:"bad@email.test"},{password:"short"}]){const r=await run({body});assert.equal(r.status,400);assert.equal(r.created,0);}});
test("failed linking removes newly created account",async()=>{const r=await run({linkFails:true});assert.equal(r.status,400);assert.equal(r.deleted,1);});
test("existing username is never taken over",async()=>{const r=await run({profile:{id:"old",role:"parent"}});assert.equal(r.status,409);assert.equal(r.created,0);assert.equal(r.updated,0);});
test("reset rejects accounts belonging to another child",async()=>{const r=await run({body:{action:"reset"},profile:{id:"old",role:"player"},accountChild:"other"});assert.equal(r.status,400);assert.equal(r.updated,0);});
test("reset requires an active link and changes only the managed account",async()=>{const r=await run({body:{action:"reset"},profile:{id:"old",role:"player"},link:{user_id:"old"}});assert.equal(r.status,200);assert.equal(r.updated,1);assert.equal(r.created,0);});
