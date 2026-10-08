const fs=require('fs'),assert=require('node:assert/strict'),vm=require('node:vm'),babel=require('next/dist/compiled/babel/core');
const compile=file=>babel.transformSync(fs.readFileSync(file,'utf8'),{filename:file,configFile:false,babelrc:false,presets:[[require('next/dist/compiled/babel/preset-react'),{runtime:'automatic'}]],plugins:[require('next/dist/compiled/babel/plugin-transform-modules-commonjs')]}).code;
function moduleOf(file, requireMock){const m={exports:{}};new Function('require','module','exports',compile(file))(requireMock,m,m.exports);return m.exports;}
const {sessionIdentity}=moduleOf('app/lib/sessionIdentity.js',require);
const portalModes=moduleOf('app/lib/portalMode.js',require);
const {resolvePortalView}=moduleOf('app/lib/usePortalView.js',require);
assert.equal(resolvePortalView('?admin=economy','overview','admin',['overview','economy'],'overview'),'economy');
assert.equal(resolvePortalView('','reports','economy',['overview','reports'],'overview'),'reports');
assert.equal(resolvePortalView('?coach=economy','economy','coach',['overview','matches'],'overview'),'overview');
assert.equal(resolvePortalView('?admin=economy','children','family',['overview','children'],'overview'),'children');

// Drive App with auth events and React hook state; ensure a refresh never unmounts the dashboard.
let states=[],deps=[],index=0,effects=[],callback,requests=0,accountRole='parent';
const react={
 useState(initial){const i=index++;if(!(i in states))states[i]=typeof initial==='function'?initial():initial;return [states[i],value=>{states[i]=typeof value==='function'?value(states[i]):value;}];},
 useRef(initial){const i=index++;if(!(i in states))states[i]={current:initial};return states[i];},
 useEffect(fn,d){const i=index++;if(!deps[i]||d.some((v,n)=>!Object.is(v,deps[i][n]))){deps[i]=d;effects.push(fn);}}
};
const components=new Map();
const supabase={auth:{onAuthStateChange(fn){callback=fn;return {data:{subscription:{unsubscribe(){}}}};}},from(name){requests++;return {select(){return this;},eq(){return this;},limit(){return Promise.resolve({data:[]});},single(){return Promise.resolve({data:{role:accountRole}});}};}};
const App=moduleOf('app/page.js',name=>{
 if(name==='react')return react;
 if(name==='./lib/sessionIdentity')return {sessionIdentity};
 if(name==='./lib/portalMode')return portalModes;
 if(name==='./lib/supabaseClient')return {supabase};
 if(name.startsWith('./components/')){if(!components.has(name))components.set(name,()=>null);return {__esModule:true,default:components.get(name)};}
 return require(name);
}).default;
const storage=new Map();
global.window={location:{search:''},sessionStorage:{getItem:key=>storage.get(key)||null,setItem:(key,value)=>storage.set(key,value)}};
function render(){index=0;effects=[];const result=App();for(const effect of effects)effect();return result;}
(async()=>{
 render();
 const user={id:'admin',email:'admin@example.com',app_metadata:{club_role:'admin'}};
 callback('INITIAL_SESSION',{user});render();await new Promise(resolve=>setImmediate(resolve));
 const before=render();assert.equal(before.type,components.get('./components/admin/AdminDashboard'));
 const reads=requests;
 callback('SIGNED_IN',{user:{...user,last_sign_in_at:'changed'}});
 const refocus=render();assert.equal(refocus.type,before.type);assert.equal(refocus.key,before.key);assert.equal(requests,reads);
 callback('TOKEN_REFRESHED',{user:{...user}});assert.equal(render().type,before.type);assert.equal(requests,reads);
 callback('SIGNED_OUT',null);assert.equal(render().type,components.get('./components/LoginScreen'));
 async function reload(id,role){states=[];deps=[];accountRole=role;render();callback('INITIAL_SESSION',{user:{id,email:`${id}@example.com`,app_metadata:{}}});render();await new Promise(resolve=>setImmediate(resolve));render();return render();}
 const choice=await reload('coach-account','coach');assert.equal(choice.type,components.get('./components/PortalChoice'));
 choice.props.onSelect('coach');assert.equal(render().type,components.get('./components/admin/AdminDashboard'));
 assert.equal((await reload('coach-account','coach')).type,components.get('./components/admin/AdminDashboard'));
 render().props.onOpenFamily();assert.equal(render().type,components.get('./components/parent/ParentDashboard'));
 assert.equal((await reload('coach-account','coach')).type,components.get('./components/parent/ParentDashboard'));
 assert.equal((await reload('other-coach','coach')).type,components.get('./components/PortalChoice'));
 assert.equal((await reload('coach-account','parent')).type,components.get('./components/parent/ParentDashboard'));
 assert.equal(portalModes.validPortalMode('admin'),null);
 // Cache policy: only the public offline notice is cached; financial/API responses never enter the worker cache.
 const events={},cached=[];
 const context={self:{addEventListener:(name,fn)=>{events[name]=fn;},location:{origin:'https://portal.example'},clients:{claim:async()=>{}}},caches:{open:async()=>({add:async path=>cached.push(path)}),keys:async()=>[],match:async()=>({offline:true})},fetch:async()=>({online:true}),URL,Response};
 vm.runInNewContext(fs.readFileSync('public/sw.js','utf8'),context);
 let pending;events.install({waitUntil:p=>pending=p});await pending;assert.deepEqual(cached,['/offline.html']);
 let intercepted=false;events.fetch({request:{method:'GET',mode:'cors',url:'https://project.supabase.co/rest/v1/club_econ_journal'},respondWith:()=>{intercepted=true;}});assert.equal(intercepted,false);
 const manifest=JSON.parse(fs.readFileSync('public/manifest.webmanifest','utf8'));assert.equal(manifest.display,'standalone');for(const icon of manifest.icons)assert.ok(fs.existsSync('public'+icon.src));
 console.log('PASS: refocus/token refresh preserve dashboard, signout resets access, view restoration respects role scope and only public offline content is cached.');
})().catch(error=>{console.error(error);process.exitCode=1;});
