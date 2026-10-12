// Component event tests with an explicitly mocked API; SQL tests cover the real DB.
const fs=require('fs'),path=require('path'),assert=require('node:assert/strict'),babel=require('next/dist/compiled/babel/core');
global.requestAnimationFrame=fn=>fn();
let states=[],index=0,effects=[],mounted=false,calls=[],fail=false;
let rows=Array.from({length:200},(_,i)=>({exercise_id:`fck-ex-${String(i+1).padStart(3,'0')}`,archived_at:null,version:0}));
const react={...require('react'),useId:()=> 'test-id',useCallback:fn=>fn,useRef:()=>({current:null}),useEffect:fn=>{if(!mounted)effects.push(fn);},useState:initial=>{const i=index++;if(!(i in states))states[i]=typeof initial==='function'?initial():initial;return [states[i],v=>{states[i]=typeof v==='function'?v(states[i]):v;}];}};
const api={from:()=>({select:async()=>({data:rows.map(r=>({...r})),error:null})}),rpc:async(name,args)=>{calls.push({name,args});if(fail)return {error:{message:'Network failure'}};const row=rows.find(r=>r.exercise_id===args.p_id);if(row.version!==args.p_expected_version)return {error:{message:'Stale version'}};row.version++;row.archived_at=args.p_archived?'2026-10-12T12:00:00Z':null;return {data:{...row},error:null};}};
function load(file){const filename=path.resolve(file),code=babel.transformSync(fs.readFileSync(filename,'utf8'),{filename,configFile:false,babelrc:false,presets:[[require('next/dist/compiled/babel/preset-react'),{runtime:'automatic'}]],plugins:[require('next/dist/compiled/babel/plugin-transform-modules-commonjs')]}).code,m={exports:{}};const r=name=>name==='react'?react:name.endsWith('/supabaseClient')?{supabase:api}:name.startsWith('.')?load(path.resolve(path.dirname(filename),name+(path.extname(name)?'':fs.existsSync(path.resolve(path.dirname(filename),name+'.jsx'))?'.jsx':'.js'))):require(name);new Function('require','module','exports',code)(r,m,m.exports);return m.exports;}
const Library=load('app/components/admin/ExerciseLibrary.jsx').default;
function nodes(tree){if(Array.isArray(tree))return tree.flatMap(nodes);if(!tree||typeof tree!=='object')return [];return [tree,...nodes(tree.props?.children)];}
const text=node=>typeof node==='string'||typeof node==='number'?String(node):Array.isArray(node)?node.map(text).join(''):node?.props?text(node.props.children):'';
function render(canManage=true){index=0;return Library({canManage});}
async function mount(){states=[];mounted=false;effects=[];render();mounted=true;effects.forEach(fn=>fn());await new Promise(setImmediate);return render();}
function button(tree,label){const matches=nodes(tree).filter(n=>n.props?.onClick&&text(n)===label);assert.equal(matches.length,1,label);return matches[0];}
function click(tree,label){return button(tree,label).props.onClick({currentTarget:{focus(){}}});}
(async()=>{
 let tree=await mount();assert.equal(nodes(tree).filter(n=>n.type==='button'&&n.key?.startsWith('fck-ex-')).length,200);
 const first=nodes(tree).find(n=>n.key==='fck-ex-001');first.props.onClick();tree=render();click(tree,'Ta bort övning');tree=render();assert.ok(text(tree).includes('Ta bort övningen?'));assert.equal(calls.length,0,'Confirmation required before API call');
 click(tree,'Avbryt');tree=render();assert.equal(calls.length,0);click(tree,'Ta bort övning');tree=render();await click(tree,'Bekräfta borttagning');tree=render();assert.equal(rows[0].archived_at!==null,true);assert.ok(text(tree).includes('Aktiva (199)'));
 tree=await mount();assert.ok(text(tree).includes('Aktiva (199)'),'Reload preserves removal');click(tree,'Borttagna (1)');tree=render();nodes(tree).find(n=>n.key==='fck-ex-001').props.onClick();tree=render();click(tree,'Återställ övning');tree=render();await click(tree,'Bekräfta återställning');tree=render();assert.equal(rows[0].archived_at,null);assert.equal(rows[0].version,2);
 click(tree,'Aktiva (200)');tree=render();nodes(tree).find(n=>n.key==='fck-ex-001').props.onClick();tree=render();click(tree,'Ta bort övning');tree=render();fail=true;await click(tree,'Bekräfta borttagning');tree=render();assert.ok(text(tree).includes('Ändringen sparades inte'));assert.equal(rows[0].archived_at,null,'Failure does not falsely remove item');fail=false;
 tree=await mount();tree=render(false);assert.ok(!text(tree).includes('Borttagna ('));nodes(tree).find(n=>n.key==='fck-ex-001').props.onClick();tree=render(false);assert.ok(!text(tree).includes('Ta bort övning'),'No manage button without admin prop');
 console.log('PASS: actual UI callbacks for confirmation/cancel, archive, persisted reload, restore, failed save and hidden non-admin controls (mock API).');
})().catch(e=>{console.error(e);process.exitCode=1;});
