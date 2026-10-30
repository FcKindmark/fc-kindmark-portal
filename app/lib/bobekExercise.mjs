export const BOBEK_EXERCISE={
 id:'fck-ex-201',title:'Frigör vänsterkanten – väggspel med pivot',collection:'Bobek Library',sport:'futsal',framework:'development',category:'Uppspel och pivot',source:'bobek',
 organisation:'4 utespelare och målvakt mot 4 utespelare och målvakt på 40 × 20 m. Börja utan motstånd. Animationen visar anfallarna; försvararna är utelämnade.',
 equipment:'Futsalbollar, västar, två mål och koner.',timing:'20 min: 5 min utan motstånd, 5 min med passiva försvarare, 3 × 3 min spel och totalt 1 min paus.',
 steps:['4 lämnar vänsterkanten och löper diagonalt högt åt höger.','5 går fram till höger; 2 går in centralt framför målvakten som säkring.','Pivot 3 öppnar till vänster efter att ytan har frigjorts.','Målvakt 1 passar direkt till 3 medan 5 erbjuder centralt stöd.','3 passar till 5 och löper fram längs vänsterkanten. 5 spelar tillbaka i ytan.','4 går mot bortre stolpen. På träningen fortsätter 3 med skott eller pass till 4 beroende på försvar och målvakt.'],
 restart:'Börja om hos målvakten efter avslutad repetition. I aktivt spel får försvararna kontra efter bollvinst.',rotation:'Byt roller efter varje block och öva även spegelvänt. Låt båda lagen starta uppspelet.',
 observe:'3 väntar tills vänsterytan är fri. 5 ger stöd när passningen från målvakten är på väg. 2 håller balans bakom bollen.',question:'Följer försvararen löpningen, eller blir en annan spelare fri?',
 easier:'Repetera långsamt utan försvarare; lägg sedan till passiva markeringar.',harder:'Spela med aktiv press. Välj en fri medspelare om försvaret stänger kombinationen.',
 diagram:{court:'futsal',players:[{id:'1',x:50,y:94,team:'gold'},{id:'2',x:88,y:72,team:'blue'},{id:'3',x:50,y:20,team:'blue'},{id:'4',x:12,y:72,team:'blue'},{id:'5',x:50,y:84,team:'blue'}],ball:'1',targets:[],arrows:[{from:'4',to:'88,20',kind:'run'},{from:'5',to:'88,42',kind:'run'},{from:'2',to:'50,84',kind:'run'},{from:'3',to:'12,42',kind:'run'},{from:'1',to:'12,42',kind:'pass'}],caption:'Bobek · frigör vänsterytan, hitta pivoten och kombinera med centralt stöd. Anfallsriktning uppåt.'},
 animation:[
 {title:'4 frigör vänsterytan',text:'4 löper diagonalt högt åt höger och försöker dra med sig sin försvarare.',moves:[['4',88,20]]},
 {title:'5 fram, 2 säkrar',text:'5 går fram till höger. 2 tar den centrala positionen framför målvakten.',moves:[['5',88,42],['2',50,84]]},
 {title:'3 öppnar till vänster',text:'Pivoten öppnar mot vänsterlinjen först när 4 har frigjort ytan.',moves:[['3',12,42]]},
 {title:'1 hittar 3',text:'Målvakten passar direkt till 3. Samtidigt kommer 5 in centralt som stöd.',moves:[['5',50,52]],ball:[16.6,44.5]},
 {title:'3 spelar till 5',text:'3 passar in till 5 och förbereder löpningen längs vänsterkanten.',ball:[45.4,54.5]},
 {title:'Väggspel och bortre stolpe',text:'5 spelar tillbaka i ytan till 3. 4 löper mot bortre stolpen.',moves:[['3',12,12],['4',62,8]],ball:[16.6,14.5]},
 {title:'Fortsättning på träningen',text:'Här slutar videons visade rörelse. Fortsätt med skott från 3 eller pass till 4, beroende på försvararnas och målvaktens positioner.'}
 ]
};
