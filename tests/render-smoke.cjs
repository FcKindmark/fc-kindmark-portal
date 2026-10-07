const fs=require('fs'),path=require('path'),assert=require('node:assert/strict');
const React=require('react'),{renderToStaticMarkup}=require('react-dom/server'),babel=require('next/dist/compiled/babel/core');
function load(file){const filename=path.resolve(file);const code=babel.transformSync(fs.readFileSync(filename,'utf8'),{filename,configFile:false,babelrc:false,presets:[[require('next/dist/compiled/babel/preset-react'),{runtime:'automatic'}]],plugins:[require('next/dist/compiled/babel/plugin-transform-modules-commonjs')]}).code;const m={exports:{}};const r=name=>name.startsWith('.')?load(path.resolve(path.dirname(filename),name+(path.extname(name)?'':fs.existsSync(path.resolve(path.dirname(filename),name+'.jsx'))?'.jsx':'.js'))):require(name);new Function('require','module','exports',code)(r,m,m.exports);return m.exports;}
const Shell=load('app/components/ClubShell.jsx').default,Overview=load('app/components/admin/OverviewTab.jsx').default;
const props={tabs:[{id:'overview',label:'Översikt'},{id:'players',label:'Spelare'},{id:'teams',label:'Lag'},{id:'trainings',label:'Träningar'},{id:'attendance',label:'Närvaro'},{id:'development',label:'Utveckling'},{id:'equipment',label:'Utrustning'}],active:'overview',user:{email:'test@example.com'},role:'Admin',onChange:()=>{},onLogout:()=>{}};
const html=renderToStaticMarkup(React.createElement(Shell,props,React.createElement(Overview,{data:{players:[],teams:[],trainings:[],matches:[]},onNavigate:()=>{}})));
assert.ok(html.includes('aria-current="page"'));assert.ok(html.includes('Inga kommande träningar'));
if(process.argv[2]){fs.mkdirSync(path.dirname(process.argv[2]),{recursive:true});fs.writeFileSync(process.argv[2],`<!doctype html><html lang="sv"><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>${fs.readFileSync('app/globals.css','utf8').replace(/@tailwind[^;]+;/g,'')}</style></head><body>${html.replace('/logo.png',path.resolve('public/logo.png'))}</body></html>`);}
const Calendar=load('app/components/EventSchedule.jsx').default,Member=load('app/components/parent/MemberOverview.jsx').default;
const date = new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Stockholm'}).format(new Date());
const fixture={players:[{id:'p1',name:'Testspelare',team_id:'team1'}],teams:[{id:'team1',name:'Testlag'}],trainings:[{id:'t1',date,time:'18:30',location:'Testsal',team_id:'team1'}],matches:[{id:'m1',date,time:'19:30',opponent:'Testmotstånd',team_id:'team1'}],payments:[],messages:[]};
const calendarHTML=renderToStaticMarkup(React.createElement(Calendar,{data:fixture,onNavigate:()=>{}}));
assert.ok(calendarHTML.includes('Testmotstånd'));assert.ok(calendarHTML.includes('18:30'));assert.ok(calendarHTML.includes('Nästa månad'));assert.ok(calendarHTML.includes('Kalendervy'));
const memberHTML=renderToStaticMarkup(React.createElement(Member,{data:fixture,players:fixture.players,onNavigate:()=>{}}));
assert.ok(memberHTML.includes('Testspelare'));assert.ok(memberHTML.includes('Svara på kallelser'));assert.ok(memberHTML.includes('Inga väntande betalningar'));
console.log('PASS: overview, accessible navigation, calendar event rendering and member overview SSR.');
