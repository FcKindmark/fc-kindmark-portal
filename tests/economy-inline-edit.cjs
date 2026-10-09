const fs=require('fs'),path=require('path'),assert=require('node:assert/strict'),babel=require('next/dist/compiled/babel/core');
process.env.NEXT_PUBLIC_SUPABASE_URL='https://example.supabase.co';process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY='public-test';
let states=[],index=0,view='documents';
const react={...require('react'),useEffect(){},useState(initial){const i=index++;if(!(i in states))states[i]=typeof initial==='function'?initial():initial;return [states[i],value=>{states[i]=typeof value==='function'?value(states[i]):value;}];}};
function load(file){const filename=path.resolve(file),code=babel.transformSync(fs.readFileSync(filename,'utf8'),{filename,configFile:false,babelrc:false,presets:[[require('next/dist/compiled/babel/preset-react'),{runtime:'automatic'}]],plugins:[require('next/dist/compiled/babel/plugin-transform-modules-commonjs')]}).code,m={exports:{}};const r=name=>name==='react'?react:name.endsWith('/usePortalView')?((key,allowed,initial)=>[key==='economy'?view:initial,()=>{}]):name.startsWith('.')?load(path.resolve(path.dirname(filename),name+(path.extname(name)?'':fs.existsSync(path.resolve(path.dirname(filename),name+'.jsx'))?'.jsx':'.js'))):require(name);new Function('require','module','exports',code)(r,m,m.exports);return m.exports;}
const Economy=load('app/components/admin/EconomyTab.jsx').default;
const year=Number(new Date().toLocaleDateString('sv-SE',{timeZone:'Europe/Stockholm'}).slice(0,4));
const data={accounts:[{code:'1930',name:'Bank',kind:'asset'},{code:'6570',name:'Bankkostnader',kind:'expense'}],documents:['d1','d2'].map(id=>({id,kind:'purchase',amount:100,document_date:year+'-01-01',party:id,reference:id,source_currency:'SEK'})),partners:['p1','p2'].map(id=>({id,name:id,year,kind:'sponsor',agreed_amount:100})),journal:[{id:'j1',status:'posted',year,date:year+'-01-01',number:1,description:'first'},{id:'j2',status:'draft',year,date:year+'-01-01',description:'second'}],lines:[{id:'l1',journal_id:'j1',account:'1930',credit:25,debit:0},{id:'l2',journal_id:'j1',account:'6570',credit:0,debit:25}],bank:[{id:'b1',date:year+'-01-01',amount:-25,description:'bank cost'}],years:[],audit:[],payment_links:[],document_links:[],settlement_selections:[]};
function nodes(tree){if(Array.isArray(tree))return tree.flatMap(nodes);if(!tree || typeof tree!=='object')return [];return [tree,...nodes(tree.props?.children)];}
function render(){index=0;return Economy({initialData:data,initialView:view});}
function click(tree,label,n=0){const buttons=nodes(tree).filter(x=>x.props?.onClick && x.props.children===label);assert.ok(buttons[n],label);buttons[n].props.onClick();}
function row(tree,key){const r=nodes(tree).find(x=>x.key===key);assert.ok(r,'row '+key);return r;}
for(const [screen,label,first,second,title] of [['documents','Ändra','d1','d2','Ändra underlag'],['partners','Ändra','p1','p2','Namn'],['journal','Ändra / rätta','j1','j2','Ändra bokförd verifikation']]){
 view=screen;states=[];let tree=render();click(tree,label);tree=render();
 const edited=nodes(row(tree,first));assert.ok(edited.some(x=>x.type==='form' || x.props?.className==='economy-editor'),screen+' editor inside selected row');
 assert.ok(!nodes(row(tree,second)).some(x=>x.type==='form' || x.props?.className==='economy-editor'),screen+' other row clean');
 click(tree,'Avbryt');tree=render();assert.ok(!nodes(tree).some(x=>x.type==='form' || x.props?.className==='economy-editor'),screen+' cancel closes editor');
 if(screen==='journal')click(tree,'Öppna / ändra');else click(tree,label,1);tree=render();assert.ok(nodes(row(tree,second)).some(x=>x.type==='form' || x.props?.className==='economy-editor'),screen+' switching moves editor');
}
view='bank';states=[];let tree=render();click(tree,'Stäm av');tree=render();const settlement=nodes(tree).find(x=>x.props?.onManual);assert.ok(settlement);settlement.props.onManual(data.bank[0]);tree=render();assert.ok(nodes(row(tree,'b1')).some(x=>x.props?.className==='economy-editor'),'manual bank editor inside bank row');
console.log('PASS: clicking edit opens under selected invoice/sponsor/journal; switching, cancelling and manual bank edits stay in the correct row.');
