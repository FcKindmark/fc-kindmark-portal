const fs=require('fs'),path=require('path'),assert=require('node:assert/strict'),babel=require('next/dist/compiled/babel/core');
let states=[],index=0,saved;
const react={...require('react'),useState(initial){const i=index++;if(!(i in states))states[i]=typeof initial==='function'?initial():initial;return [states[i],v=>states[i]=typeof v==='function'?v(states[i]):v];}};
function load(file){const filename=path.resolve(file),code=babel.transformSync(fs.readFileSync(filename,'utf8'),{filename,configFile:false,babelrc:false,presets:[[require('next/dist/compiled/babel/preset-react'),{runtime:'automatic'}]],plugins:[require('next/dist/compiled/babel/plugin-transform-modules-commonjs')]}).code,m={exports:{}};const r=name=>name==='react'?react:name.startsWith('.')?load(path.resolve(path.dirname(filename),name+(path.extname(name)?'':fs.existsSync(path.resolve(path.dirname(filename),name+'.jsx'))?'.jsx':'.js'))):require(name);new Function('require','module','exports',code)(r,m,m.exports);return m.exports;}
const Panel=load('app/components/admin/SettlementPanel.jsx').default;
const data={documents:[{id:'p',party:'Test supplier',reference:'PRO-1',kind:'purchase',is_proforma:true,amount:1000,document_date:'2026-10-22'},{id:'sales',party:'Hidden customer',kind:'sales',is_proforma:true,amount:300,document_date:'2026-10-22'}],bank:[{id:'out',amount:-300,date:'2026-10-23'},{id:'in',amount:300,date:'2026-10-23'}],journal:[],lines:[],document_links:[],payment_links:[],accounts:[]};
function nodes(tree){if(Array.isArray(tree))return tree.flatMap(nodes);if(!tree||typeof tree!=='object')return [];return [tree,...nodes(tree.props?.children)];}
const text=n=>typeof n==='string'||typeof n==='number'?String(n):Array.isArray(n)?n.map(text).join(''):n?.props?text(n.props.children):'';
function render(bank='out'){index=0;return Panel({data,payments:[],initialBank:data.bank.find(b=>b.id===bank),onSave:(proposal,action)=>saved={proposal,action}});}
let tree=render();assert.ok(text(tree).includes('PRO-1'));assert.ok(text(tree).includes('Proforma · förskott'));assert.ok(!text(tree).includes('Hidden customer'));
const checkbox=nodes(tree).find(n=>n.type==='input'&&n.props.type==='checkbox');assert.ok(checkbox);checkbox.props.onChange({target:{checked:true}});tree=render();
assert.ok(text(tree).includes('Vald proforma bokförs som förskott'));assert.ok(!text(tree).includes('Kostnadskonto'));
const save=nodes(tree).find(n=>n.props.children==='Spara utkast');assert.equal(save.props.disabled,false);save.props.onClick();
assert.equal(saved.action,'save');assert.equal(saved.proposal.document_allocations[0].account,'1480');assert.equal(saved.proposal.document_allocations[0].amount,300);assert.equal(saved.proposal.remaining,0);
assert.equal(nodes(tree).find(n=>n.props.children==='Bekräfta avstämning').props.disabled,false);
states=[];tree=render('in');assert.ok(!text(tree).includes('PRO-1'));assert.ok(!text(tree).includes('Hidden customer'));
// A posted full payment removes the proforma from available choices; a draft does not.
data.journal=[{id:'paid',status:'posted',bank_id:'other'}];data.document_links=[{journal_id:'paid',document_id:'p',amount:1000,account:'1480'}];states=[];tree=render();assert.ok(!text(tree).includes('PRO-1'));
data.journal[0].status='draft';states=[];tree=render();assert.ok(text(tree).includes('PRO-1'));
console.log('PASS: actual settlement UI selects supplier proforma, caps partial amount, keeps advance account, enables save, rejects wrong direction and hides fully paid records.');
