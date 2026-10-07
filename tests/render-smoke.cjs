const fs=require('fs'),path=require('path'),assert=require('node:assert/strict');
const React=require('react'),{renderToStaticMarkup}=require('react-dom/server'),babel=require('next/dist/compiled/babel/core');
function load(file){const filename=path.resolve(file);const code=babel.transformSync(fs.readFileSync(filename,'utf8'),{filename,configFile:false,babelrc:false,presets:[[require('next/dist/compiled/babel/preset-react'),{runtime:'automatic'}]],plugins:[require('next/dist/compiled/babel/plugin-transform-modules-commonjs')]}).code;const m={exports:{}};const r=name=>name.startsWith('.')?load(path.resolve(path.dirname(filename),name+(path.extname(name)?'':fs.existsSync(path.resolve(path.dirname(filename),name+'.jsx'))?'.jsx':'.js'))):require(name);new Function('require','module','exports',code)(r,m,m.exports);return m.exports;}
const Shell=load('app/components/ClubShell.jsx').default,Overview=load('app/components/admin/OverviewTab.jsx').default;
const props={tabs:[{id:'overview',label:'Översikt'},{id:'players',label:'Spelare'},{id:'teams',label:'Lag'},{id:'trainings',label:'Träningar'},{id:'attendance',label:'Närvaro'},{id:'development',label:'Utveckling'},{id:'equipment',label:'Utrustning'}],active:'overview',user:{email:'test@example.com'},role:'Admin',onChange:()=>{},onLogout:()=>{}};
const html=renderToStaticMarkup(React.createElement(Shell,props,React.createElement(Overview,{data:{players:[],teams:[],trainings:[],matches:[]},onNavigate:()=>{}})));
assert.ok(html.includes('aria-current="page"'));assert.ok(html.includes('Inga kommande träningar'));
if(process.argv[2]){fs.mkdirSync(path.dirname(process.argv[2]),{recursive:true});fs.writeFileSync(process.argv[2],`<!doctype html><html lang="sv"><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>${fs.readFileSync('app/globals.css','utf8').replace(/@tailwind[^;]+;/g,'')}</style></head><body>${html.replace('/logo.png',path.resolve('public/logo.png'))}</body></html>`);}
process.env.NEXT_PUBLIC_SUPABASE_URL='https://example.supabase.co';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY='test-public-key';
const Recovery=load('app/components/PasswordRecovery.jsx').default;
const resetForm=renderToStaticMarkup(React.createElement(Recovery,{user:{id:'test'},onDone:()=>{}}));
assert.ok(resetForm.includes('new-password'));assert.ok(resetForm.includes('Bekräfta lösenord'));
const expiredForm=renderToStaticMarkup(React.createElement(Recovery,{user:null,onDone:()=>{}}));
assert.ok(expiredForm.includes('Länken är ogiltig'));assert.ok(!expiredForm.includes('id="new-password"'));
const Login=load('app/components/LoginScreen.jsx').default;
assert.ok(renderToStaticMarkup(React.createElement(Login,{onLogin:()=>{}})).includes('Glömt lösenordet?'));
const Calendar=load('app/components/EventSchedule.jsx').default,Member=load('app/components/parent/MemberOverview.jsx').default;
const date = new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Stockholm'}).format(new Date());
const fixture={players:[{id:'p1',name:'Testspelare',team_id:'team1'}],teams:[{id:'team1',name:'Testlag'}],trainings:[{id:'t1',date,time:'18:30',location:'Testsal',team_id:'team1'}],matches:[{id:'m1',date,time:'19:30',opponent:'Testmotstånd',team_id:'team1'}],payments:[],messages:[]};
const calendarHTML=renderToStaticMarkup(React.createElement(Calendar,{data:fixture,onNavigate:()=>{}}));
assert.ok(calendarHTML.includes('Testmotstånd'));assert.ok(calendarHTML.includes('18:30'));assert.ok(calendarHTML.includes('Nästa månad'));assert.ok(calendarHTML.includes('Kalendervy'));
const memberHTML=renderToStaticMarkup(React.createElement(Member,{data:fixture,players:fixture.players,onNavigate:()=>{}}));
assert.ok(memberHTML.includes('Testspelare'));assert.ok(memberHTML.includes('Svara på kallelser'));assert.ok(memberHTML.includes('Inga väntande betalningar'));
const Players=load('app/components/admin/PlayersTab.jsx').default;
const rosterHTML=renderToStaticMarkup(React.createElement(Players,{data:{teams:fixture.teams,players:[{id:'roster1',name:'Roster Example',birth_year:2014,gender:'girl',number:null,team_id:null}]},onUpdate:()=>{}}));
assert.ok(rosterHTML.includes('Filtrera födelseår'));assert.ok(rosterHTML.includes('2014 · Flicka · Ej lagfördelad'));assert.ok(!rosterHTML.includes('#null'));
assert.ok(rosterHTML.includes('Lägg till förälder'));assert.ok(rosterHTML.includes('Lägg till i lag'));assert.ok(!rosterHTML.includes('Ta bort från lag'));
const assignedRoster=renderToStaticMarkup(React.createElement(Players,{data:fixture,onUpdate:()=>{}}));
assert.ok(assignedRoster.includes('Ta bort från lag'));
const coachRoster=renderToStaticMarkup(React.createElement(Players,{data:fixture,onUpdate:()=>{},readOnly:true}));
for(const label of ['Lägg till förälder','Lägg till i lag','Ta bort från lag','Ta bort spelare'])assert.ok(!coachRoster.includes(label));
const Actions=load('app/components/admin/PlayerActions.jsx').default;
const actionProps={player:fixture.players[0],teams:fixture.teams,accounts:[{id:'parent1',full_name:'Example Guardian',email:'guardian@example.com'}],onClose:()=>{},onUpdate:()=>{}};
const parentAction=renderToStaticMarkup(React.createElement(Actions,{...actionProps,mode:'parent'}));
assert.ok(parentAction.includes('Example Guardian'));assert.ok(parentAction.includes('Förälderns konto'));
const teamAction=renderToStaticMarkup(React.createElement(Actions,{...actionProps,mode:'team'}));
assert.ok(teamAction.includes('Testlag'));assert.ok(teamAction.includes('Spara lag'));
const MemberCard=load('app/components/MemberCards.jsx').MemberCard;
const activeCard=renderToStaticMarkup(React.createElement(MemberCard,{card:{name:'Example Member',member_number:'FCK-1001',status:'active'}}));
const inactiveCard=renderToStaticMarkup(React.createElement(MemberCard,{card:{name:'Example Member',member_number:'FCK-1001',status:'inactive'}}));
assert.ok(activeCard.includes('FCK-1001'));assert.ok(activeCard.includes('Kopiera rabattkod'));assert.ok(!inactiveCard.includes('Kopiera rabattkod'));assert.ok(activeCard.includes('/logo.png'));
const Matches=load('app/components/admin/MatchesTab.jsx').default;
const matchHTML=renderToStaticMarkup(React.createElement(Matches,{data:{...fixture,matches:[{...fixture.matches[0],club_score:0,opponent_score:0}]},onUpdate:()=>{}}));
assert.ok(matchHTML.includes('FC Kindmark 0–0'));assert.ok(matchHTML.includes('Öppna resultat och kallelser'));
const Fixtures=load('app/components/SupporterDashboard.jsx').SupporterFixtures;
const supporterHTML=renderToStaticMarkup(React.createElement(Fixtures,{matches:fixture.matches}));
assert.ok(supporterHTML.includes('Testmotstånd'));assert.ok(!supporterHTML.includes('Testspelare'));
console.log('PASS: overview, navigation, calendar, recovery, roster, cards, results and supporter fixtures.');

const Payments=load('app/components/admin/PaymentsTab.jsx').default,PaymentForm=load('app/components/admin/PaymentForm.jsx').default;
const paymentFixture={id:'payment1',player_id:'p1',player_name:'Testspelare',amount:150.5,status:'pending',description:'Test Fee',due_date:'2000-01-01',reference:'TEST-REF',swish:'1230830323'};
const paymentHTML=renderToStaticMarkup(React.createElement(Payments,{data:{...fixture,payments:[paymentFixture]},onUpdate:()=>{}}));
for(const text of ['Ändra','Ta bort','Markera betald','Förfallen','TEST-REF','Filtrera betalningsstatus'])assert.ok(paymentHTML.includes(text));
const paymentFormHTML=renderToStaticMarkup(React.createElement(PaymentForm,{payment:paymentFixture,players:fixture.players,onSave:()=>{},onClose:()=>{},busy:false}));
for(const text of ['Ändra betalning','Test Fee','Förfallodatum','TEST-REF','150.5'])assert.ok(paymentFormHTML.includes(text));
console.log('PASS: payment actions, overdue labels and populated edit form.');

const paidFormHTML=renderToStaticMarkup(React.createElement(PaymentForm,{payment:{...paymentFixture,status:'paid'},players:fixture.players,onSave:()=>{},onClose:()=>{},busy:false}));
assert.ok(paidFormHTML.includes('transaktionsreferens'));assert.ok(paidFormHTML.includes('Jag har kontrollerat'));assert.ok(paymentHTML.includes('5246-1142'));
console.log('PASS: club payment details and receipt verification form.');

const shortCard=renderToStaticMarkup(React.createElement(MemberCard,{card:{name:'Example Member',membership_no:1001,member_number:'FCK-1001',status:'active'}}));
assert.ok(shortCard.includes('1001'));assert.ok(shortCard.includes('FCK-1001'));
const linkedPayment=renderToStaticMarkup(React.createElement(PaymentForm,{payment:{...paymentFixture,member_id:'c1',membership_no:1001,payment_kind:'membership',membership_year:2026},players:fixture.players,members:[{id:'c1',membership_no:1001,player_id:'p1',name:'Testspelare'}],onSave:()=>{},onClose:()=>{},busy:false}));
assert.ok(linkedPayment.includes('1001-2026'));assert.ok(linkedPayment.includes('Ursprungligt bankmeddelande'));const reportsHTML=renderToStaticMarkup(React.createElement(Payments,{data:{...fixture,payments:[paymentFixture]},initialView:'reports',onUpdate:()=>{}}));assert.ok(reportsHTML.includes('Exportera medlemsbetalningar'));
console.log('PASS: short member numbers, annual report actions and payment/member linking form.');

const Fees=load('app/components/admin/MembershipFees.jsx').default;
const feesHTML=renderToStaticMarkup(React.createElement(Fees,{members:[{id:'c1',player_id:'p1',name:'Testspelare',membership_no:1001,fee_plan:'new',status:'active'}],payments:[],onUpdate:()=>{}}));
for(const text of ['Ny medlem','Medlem','Avgift saknas','1001','Spara priser'])assert.ok(feesHTML.includes(text));
console.log('PASS: new/full pricing, unpriced membership and automatic fee controls.');

const supportFees=renderToStaticMarkup(React.createElement(Fees,{members:[{id:'s1',name:'Supporter Example',membership_no:1031,membership_type:'supporter',status:'active'}],payments:[],onUpdate:()=>{}}));
assert.ok(supportFees.includes('Stödmedlem'));assert.ok(supportFees.includes('Supporter Example'));assert.ok(supportFees.includes('150 SEK'));
const ParentPayments=load('app/components/parent/PaymentsView.jsx').default;
const supportPay=renderToStaticMarkup(React.createElement(ParentPayments,{data:{players:[],payments:[{...paymentFixture,player_id:null,player_name:'Supporter Example',reference:'1031-2026'}]},memberPayments:true}));
assert.ok(supportPay.includes('Supporter Example'));assert.ok(supportPay.includes('1031-2026'));
console.log('PASS: fixed supporter price and own supporter payment view.');

const CardsAdmin=load('app/components/MemberCards.jsx').default;
const adminMemberHTML=renderToStaticMarkup(React.createElement(CardsAdmin,{admin:true}));
assert.ok(!adminMemberHTML.includes('+ Lägg till medlem'));assert.ok(!adminMemberHTML.includes('id="new-member-name"'));
const memberAddHTML=renderToStaticMarkup(React.createElement(CardsAdmin,{admin:true,initialShowAdd:true}));
for(const text of ['Medlemmens namn','Ny medlem','Medlem','Stödmedlem','Spara medlem'])assert.ok(memberAddHTML.includes(text));
const paymentsAdd=renderToStaticMarkup(React.createElement(Payments,{data:fixture,onUpdate:()=>{},onAddMember:()=>{}}));
assert.ok(!paymentsAdd.includes('+ Lägg till medlem'));
console.log('PASS: visible member creation button, category form and payments shortcut.');

const Users=load('app/components/admin/UsersTab.jsx').default,CoachForm=load('app/components/admin/CoachForm.jsx').default;
const usersHTML=renderToStaticMarkup(React.createElement(Users,{data:{...fixture,profiles:[]},onUpdate:()=>{}}));
assert.ok(!usersHTML.includes('+ Lägg till medlem'));assert.ok(usersHTML.includes('Tränare och lag'));
const coachFormHTML=renderToStaticMarkup(React.createElement(CoachForm,{profiles:[{id:'coach1',email:'coach@example.com',role:'parent'},{id:'admin1',email:'admin@example.com',role:'admin'}],teams:fixture.teams,coach:{id:'coach1'},assigned:['team1'],busy:false,onSave:()=>{},onClose:()=>{}}));
assert.ok(coachFormHTML.includes('Ändra tränarens lag'));assert.ok(coachFormHTML.includes('coach@example.com'));assert.ok(!coachFormHTML.includes('admin@example.com'));assert.ok(coachFormHTML.includes('checked=""'));assert.ok(coachFormHTML.includes('Spara tränare'));
console.log('PASS: trainer creation entry point, preselected teams and protected admin options.');

const Children=load('app/components/parent/ChildrenView.jsx').default;
const familyFixture={...fixture,players:[{id:'child1',name:'Linked Child One',team_id:'team1',mother_email:'different@example.com'},{id:'child2',name:'Linked Child Two',team_id:'team2',father_email:'different@example.com'},{id:'other',name:'Other Family Child',team_id:'team1'}]};
const linkedChildren=renderToStaticMarkup(React.createElement(Children,{data:familyFixture,userEmail:'coach-parent@example.com',linkedPlayerIds:['child1','child2']}));
assert.ok(linkedChildren.includes('Linked Child One'));assert.ok(linkedChildren.includes('Linked Child Two'));assert.ok(!linkedChildren.includes('Other Family Child'));
const Parent=load('app/components/parent/ParentDashboard.jsx').default,Admin=load('app/components/admin/AdminDashboard.jsx').default;
const familyPortal=renderToStaticMarkup(React.createElement(Parent,{user:{id:'coach-parent',email:'coach-parent@example.com'},profile:{role:'parent'},staffRole:'coach',onBackToStaff:()=>{},onLogout:()=>{}}));
assert.ok(familyPortal.includes('Till tränarportalen'));assert.ok(familyPortal.includes('Uppdatera'));
const trainerPortal=renderToStaticMarkup(React.createElement(Admin,{user:{id:'coach-parent',email:'coach-parent@example.com'},profile:{role:'coach'},onOpenFamily:()=>{},onLogout:()=>{}}));
assert.ok(trainerPortal.includes('Föräldraportal · Mina barn'));
console.log('PASS: explicit parent links show both children without email matching; unrelated child hidden; coach/family switching and refresh controls visible.');

const Choice=load('app/components/PortalChoice.jsx').default;
const choiceHTML=renderToStaticMarkup(React.createElement(Choice,{onSelect:()=>{},onLogout:()=>{}}));
assert.ok(choiceHTML.includes('Öppna tränarportalen'));assert.ok(choiceHTML.includes('Öppna föräldraportalen'));assert.ok(choiceHTML.includes('150 SEK'));
const combinedPay=renderToStaticMarkup(React.createElement(ParentPayments,{data:{...familyFixture,payments:[{...paymentFixture,id:'supporter-fee',member_id:'own-card',player_id:null,player_name:'Personal Supporter',description:'Stödmedlem'},{...paymentFixture,id:'child-fee',player_id:'child1',player_name:'Linked Child One'},{...paymentFixture,id:'other-fee',member_id:'other-card',player_id:'other',player_name:'Other Family Child'}]},userEmail:'coach-parent@example.com',linkedPlayerIds:['child1','child2'],ownMemberIds:['own-card']}));
assert.ok(combinedPay.includes('Personal Supporter'));assert.ok(combinedPay.includes('Linked Child One'));assert.ok(!combinedPay.includes('Other Family Child'));
console.log('PASS: coach choice and combined own-supporter/child payments, excluding other families.');

const TrainingParent=load('app/components/parent/TrainingsView.jsx').default;
const cleanedTraining=renderToStaticMarkup(React.createElement(TrainingParent,{data:{...fixture,trainings:[{...fixture.trainings[0],time:'20:30:00',admin_comment:'Tid: 20:30–22:00. Kommunens bokningsnr: 96633. Källa: BookingExcel-20261007055135.xlsx. Ta med vattenflaska.'}]},userEmail:'different@example.com',linkedPlayerIds:['p1'],onRefresh:()=>{}}));
assert.ok(cleanedTraining.includes('20:30–22:00'));assert.ok(cleanedTraining.includes('Ta med vattenflaska'));assert.ok(!cleanedTraining.includes('BookingExcel'));assert.ok(!cleanedTraining.includes('96633'));assert.ok(!cleanedTraining.includes('20:30:00'));
console.log('PASS: parent training details retain time and coach information while omitting import filenames, booking numbers and seconds.');

const MatchesParent=load('app/components/parent/MatchesView.jsx').default;
const parentMatches=renderToStaticMarkup(React.createElement(MatchesParent,{data:{...fixture,matches:[{...fixture.matches[0],time:'19:30:00',admin_comment:'Samling 19:00. Källa: BookingExcel-test.xlsx.'},{id:'other-match',date,team_id:'other-team',opponent:'Other Team Opponent'}]},userEmail:'different@example.com',linkedPlayerIds:['p1'],onRefresh:()=>{}}));
assert.ok(parentMatches.includes('Testmotstånd'));assert.ok(parentMatches.includes('Samling 19:00'));assert.ok(!parentMatches.includes('BookingExcel'));assert.ok(!parentMatches.includes('Other Team Opponent'));assert.ok(!parentMatches.includes('19:30:00'));
console.log('PASS: newly supplied team match visible to linked parent; other team excluded; clean match information.');

const PlayerAccount=load('app/components/admin/PlayerAccount.jsx').default;
const playerAccountHTML=renderToStaticMarkup(React.createElement(PlayerAccount,{player:fixture.players[0],accounts:[{id:'own-player',role:'parent',email:'player@example.com'},{id:'protected-coach',role:'coach',email:'coach@example.com'}],onUpdate:()=>{},onClose:()=>{}}));
assert.ok(playerAccountHTML.includes('Spelarens eget konto'));assert.ok(playerAccountHTML.includes('player@example.com'));assert.ok(!playerAccountHTML.includes('coach@example.com'));assert.ok(rosterHTML.includes('Lägg till spelarkonto'));assert.ok(!coachRoster.includes('Lägg till spelarkonto'));
const selfProfile=renderToStaticMarkup(React.createElement(Children,{data:familyFixture,self:true,userEmail:'player@example.com',linkedPlayerIds:['child1']}));
assert.ok(selfProfile.includes('Min profil'));assert.ok(selfProfile.includes('Linked Child One'));assert.ok(!selfProfile.includes('Linked Child Two'));assert.ok(!selfProfile.includes('Mina barn'));
console.log('PASS: own-player account entry, protected coach accounts excluded, own profile shown without sibling access.');

const AddChoice=load('app/components/admin/AddMemberChoice.jsx').default;
const addChoiceHTML=renderToStaticMarkup(React.createElement(AddChoice,{onChoose:()=>{},onClose:()=>{}}));
for(const label of ['Spelare','Medlem','Stödmedlem','Tränare'])assert.ok(addChoiceHTML.includes(label));
const createPlayerHTML=renderToStaticMarkup(React.createElement(Players,{data:fixture,initialShowAdd:true,onUpdate:()=>{}}));
assert.ok(createPlayerHTML.includes('Lägg till ny spelare'));
assert.ok(createPlayerHTML.includes('<option value="full">Medlem</option>'));
assert.ok(!createPlayerHTML.includes('Stödmedlem')); 
for(const category of ['new','full','supporter']){
 const selectedMemberHTML=renderToStaticMarkup(React.createElement(CardsAdmin,{admin:true,initialShowAdd:true,initialMembershipType:category}));
 assert.ok(selectedMemberHTML.includes(`value="${category}" selected=""`));
}
const createCoachHTML=renderToStaticMarkup(React.createElement(Users,{data:{...fixture,profiles:[]},initialShowCoach:true,currentUserId:'admin',onUpdate:()=>{}}));
assert.ok(createCoachHTML.includes('Tränarens konto'));
console.log('PASS: universal member choices open player/member/coach forms with selected membership pricing.');

assert.ok(!paymentHTML.includes("Spara priser och skapa saknade avgifter"));
assert.ok(!paymentHTML.includes("Exportera medlemsbetalningar"));
assert.ok(paymentHTML.includes("Betalningsinstruktioner</summary>"));
assert.ok(reportsHTML.includes("Medlemsbetalningar – årslista"));
console.log("PASS: payments list separates fee settings and reports, with expandable instructions.");
