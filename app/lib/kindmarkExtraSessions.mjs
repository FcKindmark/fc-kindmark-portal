// New FC Kindmark coach-review drafts. Each block has its own authored tactical diagram.
const P=(x,y,n,c='blue')=>[x,y,n,c];
const D=(players,paths,caption,extra={})=>({players,paths,caption,...extra});
const B=(title,minutes,organisation,steps,diagram,extra={})=>({
 title,minutes,organisation,diagram,steps,
 timing:`${minutes} min inklusive instruktion, aktivitet, vila och byte.`,
 restart:'Vid boll ut eller mål: sätt igång en ny boll direkt från startpositionen.',
 rotation:'Byt roller efter varje omgång så att alla får prova båda uppgifterna.',
 say:'Titta upp före mottagning. Välj lösning utifrån medspelare, motståndare och fri yta.',
 observe:'Blick före mottagning, avstånd mellan spelarna och val under press.',
 easier:'Öka ytan och ge mottagaren mer tid.',
 harder:'Minska ytan något eller låt försvararen börja närmare.',
 ...extra
});
export const KINDMARK_EXTRA_SESSIONS=[
{
 id:'football-11-13-kindmark-scanning-03',sport:'football',age:'11–13',status:'draft',version:1,
 title:'Kindmark: spelbarhet, scanning och spelvändning',minutes:75,players:12,
 goal:'Hitta spelbara vinklar, orientera sig före bollmottagning och vända spelet genom en fri medspelare.',
 equipment:'12 bollar, koner, västar i två färger och fyra småmål.',
 principle:'Bollnära lärande, många beslut och hög delaktighet; anpassa press till spelarens erfarenhet.',
 ballPriority:'Bollen används i samtliga spelövningar. Undvik köer och isolerad konditionslöpning.',
 blocks:[
 B('Scanning med egen boll',12,'12 spelare med varsin boll på 25 × 20 m. Fyra konportar i ytterkanterna.',[
 'Driv bollen fritt och titta efter lediga portar.','Passera en port, vänd och välj en annan.','Tränaren visar en färg; spelaren identifierar färgen innan nästa vändning.'
 ],D([P(75,70,'1'),P(170,65,'2'),P(275,80,'3'),P(350,80,'4'),P(75,165,'5'),P(170,155,'6'),P(275,165,'7'),P(350,165,'8'),P(75,250,'9'),P(170,250,'10'),P(275,250,'11'),P(350,250,'12')],['M95 70Q120 95 120 130','M295 165Q330 200 340 235'],'Alla tolv har varsin boll; välj port efter att ha tittat upp.',{gates:true,kinds:['dribble','dribble']}),{restart:'Spelaren hämtar sin egen boll och fortsätter.',rotation:'Alla deltar samtidigt, inga köer.'}),
 B('Triangel: spela och flytta',13,'Fyra trianglar med tre spelare och en boll per grupp, cirka 8 m mellan konerna.',[
 'A passar B och tar ny vinkel.','B tittar mot C före mottagningen.','B väljer passning till A eller C; upprepa med växlande riktning.'
 ],D([P(70,245,'A'),P(205,65,'B'),P(350,245,'C')],['M90 225L188 85','M222 84L332 225','M80 232Q145 280 190 250'],'En av fyra trianglar. B väljer mottagare, ingen låst ordning.',{kinds:['pass','pass','run']})),
 B('Tre mot en: tredje spelare',15,'Tre ytor på cirka 12 × 10 m. Fyra spelare per yta: tre anfallare mot en försvarare.',[
 'Anfallarna håller triangelform.','Mottagaren tittar över axeln och väljer nästa passning.','Försvararen vinner bollen genom brytning; byt försvarare efter 90 sekunder.'
 ],D([P(85,85,'A'),P(335,85,'B'),P(215,245,'C'),P(205,150,'D','red')],['M105 90L311 90','M323 105L232 227'],'En av tre ytor. Tre blå håller triangeln runt en röd försvarare.',{kinds:['pass','pass']}),{rotation:'Byt försvarare efter varje 90-sekundersomgång.'}),
 B('Spelvändning 4 mot 2',20,'Två planer cirka 24 × 18 m. Fyra anfallare mot två försvarare på varje plan, med sidokorridorer.',[
 'Anfallarna försöker hitta fri sida genom två eller fler spelbara alternativ.','Försvararna styr mot en sida och försöker bryta.','Vid bollvinst driver försvararna över närmaste kortlinje.'
 ],D([P(75,80,'1'),P(75,245,'2'),P(205,80,'3'),P(205,245,'4'),P(270,120,'5','red'),P(270,205,'6','red')],['M95 90L185 90','M200 105Q155 155 95 225'],'En av två planer: fyra blå söker byte från övre till nedre korridoren.',{kinds:['pass','pass'],targetZone:true}),{rotation:'Efter 3 min byter två anfallare med försvararna.'}),
 B('Smålagsspel 3 mot 3',15,'Två planer 20 × 15 m, tre mot tre och små mål på båda kortsidorna.',[
 'Spela fritt mot motståndarnas mål.','Ge poäng för mål efter att laget bytt anfallssida.','Samla kort: när hittade vi en fri medspelare?'
 ],D([P(80,85,'1'),P(80,240,'2'),P(165,165,'3'),P(285,85,'4','red'),P(285,240,'5','red'),P(235,165,'6','red')],['M95 100L150 152','M172 172L95 225'],'Tre mot tre mot två mål; spelvändning är bonus, inte tvång.',{goals:true,kinds:['pass','pass']}),{rotation:'Alla sex spelar, byt lagkamrater mellan omgångarna.'})
 ]
},
{
 id:'football-14-16-kindmark-transitions-03',sport:'football',age:'14–16',status:'draft',version:1,
 title:'Kindmark: press, återerövring och omställning',minutes:90,players:12,
 goal:'Känna igen pressignaler, säkra täckning och välja rätt första aktion efter bollvinst.',
 equipment:'Bollar, koner, två färger västar, två småmål och två säkrade större mål vid behov.',
 principle:'Spelbaserade beslut och kollektivt ansvar; belastning och press anpassas individuellt.',
 ballPriority:'Varje del har boll och beslut; korta återhämtningspauser mellan intensiva aktioner.',
 blocks:[
 B('Orientering och passningsvinklar',15,'Fyra grupper om tre i 10 × 10 m rutor, en boll per grupp.',[
 'A passar B och löper förbi en kon.','B tittar efter C före mottagning och öppnar kroppen.','C väljer återspel eller passning till A:s nya vinkel.'
 ],D([P(80,225,'A'),P(200,90,'B'),P(345,225,'C')],['M100 205L185 108','M215 107L325 205','M105 225Q200 280 300 225'],'En av fyra grupper. A flyttar till ny vinkel efter passning.',{kinds:['pass','pass','run']})),
 B('Pressignal: felvänd mottagare',15,'Två ytor 20 × 15 m. Tre anfallare och tre försvarare per yta.',[
 'Blå startar med passning till felvänd medspelare.','När bollen går mot felvänd spelare pressar närmaste röd.','Övriga röda säkrar bakom och stänger central passning.'
 ],D([P(80,155,'A'),P(200,155,'B'),P(335,80,'C'),P(260,100,'1','red'),P(300,210,'2','red'),P(145,245,'3','red')],['M100 155L178 155','M265 115L218 145','M285 205L230 178'],'Press startar när passningen går mot felvänd B.',{kinds:['pass','run','run']}),{observe:'Timing på första press, understöd och stängd central yta.'}),
 B('Återerövring inom fem sekunder',20,'Två 18 × 18 m ytor. Tre mot tre, med två konportar på varje ytas kortsidor.',[
 'Blå anfaller genom valfri port.','Vid bollförlust försöker blå återerövra snabbt tillsammans.','Om röd spelar ur pressen får röd anfalla motsatt port; undvik blind jakt.'
 ],D([P(95,90,'1'),P(90,235,'2'),P(200,165,'3'),P(280,85,'4','red'),P(300,225,'5','red'),P(245,170,'6','red')],['M205 170L262 170','M100 95Q145 125 190 150'],'Tre mot tre; kollektiv press direkt efter bollförlust.',{gates:true,kinds:['pass','run']}),{rotation:'Två grupper om sex, byt startlag efter tre minuter.'}),
 B('Bollvinst till mål 4 mot 2',20,'Två planer 25 × 20 m. Fyra anfallare mot två försvarare; ett mål på vardera kortsidan.',[
 'Fyra blå bygger upp och försöker göra mål.','Två röda vinner bollen och anfaller omedelbart motsatt mål.','Efter avslut startar tränaren ny boll och rollerna växlar.'
 ],D([P(85,75,'1'),P(85,245,'2'),P(175,90,'3'),P(175,230,'4'),P(255,120,'5','red'),P(265,210,'6','red')],['M180 100L245 128','M245 140Q180 165 85 180'],'Fyra blå bygger; två röda kontrar mot motsatt mål efter bollvinst.',{goals:true,kinds:['pass','dribble']}),{rotation:'Byt försvarare efter varje tvåminutersomgång.'}),
 B('Matchspel med omställningsfokus',20,'Två planer 26 × 20 m. Tre mot tre per plan, småmål i båda ändar.',[
 'Spela fritt tre mot tre.','Tränaren noterar första beslutet efter bollvinst och laget närmast bollen efter förlust.','Avsluta med kort gemensam reflektion om ett lyckat press- och omställningsögonblick.'
 ],D([P(95,75,'1'),P(125,235,'2'),P(195,155,'3'),P(290,75,'4','red'),P(290,235,'5','red'),P(245,165,'6','red')],['M250 170Q215 100 135 90','M190 160L145 225'],'Tre mot tre: efter bollvinst anfaller laget åt motsatt håll.',{goals:true,kinds:['dribble','pass']}),{rotation:'Alla deltar; byt motstånd mellan spelomgångarna.'})
 ]
}
];
