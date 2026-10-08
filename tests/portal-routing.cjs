const fs=require('fs'),assert=require('node:assert/strict'),babel=require('next/dist/compiled/babel/core');
const code=babel.transformSync(fs.readFileSync('app/page.js','utf8'),{filename:'app/page.js',configFile:false,babelrc:false,presets:[[require('next/dist/compiled/babel/preset-react'),{runtime:'automatic'}]],plugins:[require('next/dist/compiled/babel/plugin-transform-modules-commonjs')]}).code;
const components=new Map();
const modeModule={exports:{}};
new Function('require','module','exports',babel.transformSync(fs.readFileSync('app/lib/portalMode.js','utf8'),{configFile:false,babelrc:false,plugins:[require('next/dist/compiled/babel/plugin-transform-modules-commonjs')]}).code)(require,modeModule,modeModule.exports);
function route({role='parent',mode=null,supporter=false,children=false,metadata={}}={}){
  const state=[{id:'account',email:'account@example.com',app_metadata:metadata},mode,true,'',0,supporter,children,{role},false,false];let index=0;
  const module={exports:{}};
  const requireMock=name=>{
    if(name==='react')return {useState:()=>[state[index++],()=>{}],useEffect:()=>{},useRef:()=>({current:''})};
    if(name.startsWith('./components/')){if(!components.has(name))components.set(name,()=>null);return {__esModule:true,default:components.get(name)};}
    if(name==='./lib/sessionIdentity')return {sessionIdentity:u=>`${u?.id||''}:${u?.app_metadata?.club_role||''}`};
    if(name==='./lib/push')return {disableDevicePush:async()=>{}};
 if(name==='./lib/supabaseClient')return {supabase:{}};
    if(name==='./lib/portalMode')return modeModule.exports;
    return require(name);
  };
  new Function('require','module','exports',code)(requireMock,module,module.exports);
  return module.exports.default();
}
function expectPortal(input,path){const element=route(input);assert.equal(element.type,components.get('./components/'+path));return element;}
expectPortal({},'parent/ParentDashboard');
const player=expectPortal({role:'player',children:true},'parent/ParentDashboard');assert.equal(player.props.profile.role,'player');assert.equal(player.props.onBackToStaff,undefined);
expectPortal({role:'parent',mode:'coach',metadata:{club_role:'parent'}},'parent/ParentDashboard');
expectPortal({role:'coach',supporter:true,children:true},'PortalChoice');
const coach=expectPortal({role:'coach',mode:'coach',supporter:true},'admin/AdminDashboard');assert.equal(typeof coach.props.onOpenFamily,'function');
const family=expectPortal({role:'coach',mode:'parent',supporter:true,children:true},'parent/ParentDashboard');assert.equal(typeof family.props.onBackToStaff,'function');
const parent=expectPortal({supporter:true,children:true},'parent/ParentDashboard');assert.equal(parent.props.onBackToStaff,undefined);
expectPortal({supporter:true},'SupporterDashboard');
const admin=expectPortal({metadata:{club_role:'admin'}},'admin/AdminDashboard');assert.equal(admin.props.onOpenFamily,undefined);
console.log('PASS: only admin-assigned coaches choose portals; parent/supporter access coexists; admins and ordinary parents have no trainer choice.');
