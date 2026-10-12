const fs=require('fs'),path=require('path'),assert=require('node:assert/strict'),babel=require('next/dist/compiled/babel/core');
global.window={addEventListener(){},removeEventListener(){},confirm:()=>true};
const originalInterval=global.setInterval;global.setInterval=()=>0;
let states=[],index=0,effects=[],mounted=false,draft=null,publication=null,fail=false,requests=[];
let props={trainingId:'training-test',canManage:true};
const react={...require('react'),useId:()=> 'test',useRef:()=>({current:null}),useCallback:fn=>fn,useEffect:fn=>{if(!mounted)effects.push(fn);},useState:initial=>{const i=index++;if(!(i in states))states[i]=typeof initial==='function'?initial():initial;return [states[i],v=>{states[i]=typeof v==='function'?v(states[i]):v;}];}};
const api={from:table=>({select:()=>({eq:()=>({maybeSingle:async()=>({data:table==='club_training_plan_drafts'?draft:publication,error:null})}),then:resolve=>resolve({data:[],error:null})})}),rpc:async(name,args)=>{
 requests.push({name,args});if(fail)return {error:{message:'Stale version'}};
 if(name==='club_unpublish_training_plan'){publication=null;draft={...draft,version:draft.version+1};}
 else{assert.equal(args.p_expected_version,draft?.version||0);draft={exercise_ids:[...args.p_exercises],notes:args.p_notes,version:(draft?.version||0)+1};if(args.p_publish)publication={exercise_ids:[...draft.exercise_ids],notes:draft.notes,published_at:'2026-10-12T12:00:00Z'};}
 return {data:draft.version,error:null};
}};
function load(file){const filename=path.resolve(file),code=babel.transformSync(fs.readFileSync(filename,'utf8'),{filename,configFile:false,babelrc:false,presets:[[require('next/dist/compiled/babel/preset-react'),{runtime:'automatic'}]],plugins:[require('next/dist/compiled/babel/plugin-transform-modules-commonjs')]}).code,m={exports:{}};const r=name=>name==='react'?react:name.endsWith('/supabaseClient')?{supabase:api}:name.startsWith('.')?load(path.resolve(path.dirname(filename),name+(path.extname(name)?'':fs.existsSync(path.resolve(path.dirname(filename),name+'.jsx'))?'.jsx':'.js'))):require(name);new Function('require','module','exports',code)(r,m,m.exports);return m.exports;}
const Plan=load('app/components/admin/TrainingExercisePlan.jsx').default;
function nodes(tree){if(Array.isArray(tree))return tree.flatMap(nodes);return tree&&typeof tree==='object'?[tree,...nodes(tree.props?.children)]:[];}
const text=node=>typeof node==='string'||typeof node==='number'?String(node):Array.isArray(node)?node.map(text).join(''):node?.props?text(node.props.children):'';
function render(){index=0;return Plan(props);}
async function mount(nextProps){props=nextProps;states=[];mounted=false;effects=[];render();mounted=true;effects.forEach(fn=>fn());await new Promise(setImmediate);return render();}
function click(tree,label){const n=nodes(tree).filter(n=>n.props?.onClick&&text(n)===label);assert.equal(n.length,1,label);return n[0].props.onClick();}
(async()=>{
 let tree=await mount({trainingId:'training-test',canManage:true,addExerciseId:'fck-ex-101',onAdded(){}});
 // Execute the pending-add effect once after the async initial load, as React does.
 mounted=false;effects=[];render();mounted=true;effects.slice(1,2).forEach(fn=>fn());tree=render();assert.ok(text(tree).includes('1 övningar'));assert.equal(requests.length,0,'Transfer stays unsaved');
 await click(tree,'Spara utkast');assert.deepEqual(draft.exercise_ids,['fck-ex-101']);assert.equal(publication,null);
 tree=render();const choice=nodes(tree).find(n=>n.type==='label'&&text(n).includes('fck-ex-121'));nodes(choice).find(n=>n.type==='input').props.onChange();tree=render();
 await click(tree,'Publicera för tränarna');assert.deepEqual(publication.exercise_ids,['fck-ex-101','fck-ex-121']);
 tree=render();nodes(tree).find(n=>n.type==='textarea').props.onChange({target:{value:'Nytt utkast'}});tree=render();await click(tree,'Spara utkast');assert.equal(draft.notes,'Nytt utkast');assert.equal(publication.notes,'','Published snapshot unchanged by draft save');
 tree=await mount({trainingId:'training-test',canManage:false});assert.ok(!text(tree).includes('Spara utkast'));assert.ok(!text(tree).includes('Nytt utkast'));assert.ok(text(tree).includes('Bollflytt till sidoficka'));
 tree=await mount({trainingId:'training-test',canManage:true});const details=nodes(tree).find(n=>n.type==='details'&&text(n).includes('1. Bollflytt'));await click(details,'Flytta ner');tree=render();await click(tree,'Publicera uppdaterad plan');assert.deepEqual(publication.exercise_ids,['fck-ex-121','fck-ex-101']);assert.equal(publication.notes,'Nytt utkast');
 tree=render();fail=true;await click(tree,'Publicera uppdaterad plan');tree=render();assert.ok(text(tree).includes('Planen sparades inte'));fail=false;
 tree=await mount({trainingId:'training-test',canManage:true});await click(tree,'Återkalla publicering');assert.equal(publication,null);assert.equal(draft.exercise_ids.length,2,'Unpublish preserves draft');
 const programs=fs.readFileSync('app/components/admin/TrainingPrograms.jsx','utf8'),trainings=fs.readFileSync('app/components/admin/TrainingsTab.jsx','utf8'),dashboard=fs.readFileSync('app/components/admin/AdminDashboard.jsx','utf8');
 assert.ok(programs.includes('<ExerciseLibrary'));assert.ok(!trainings.includes('Övningsbibliotek'));assert.ok(trainings.includes('<TrainingExercisePlan'));assert.ok(dashboard.includes("setActiveTab('trainings')"));
 console.log('PASS: library transfer, draft save, publish, ordered coach snapshot, private draft changes, conflict, unpublish/restore and Träningsprogram placement (mock API).');
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>{global.setInterval=originalInterval;});
