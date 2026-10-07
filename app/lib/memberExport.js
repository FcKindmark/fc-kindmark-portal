import { csvText } from './attendance.js';
import { stockholmToday } from './schedule.js';
export function memberExportRows(cards, activeOnly = true) {
  return [['Medlemsnummer / rabattkod','Namn','Medlemstyp','Status'], ...cards.filter(c=>!activeOnly || c.status==='active').map(c=>[c.member_number,c.name,c.membership_type==='supporter' ? 'Stödmedlem' : 'Medlem',c.status==='active' ? 'Aktiv' : 'Inaktiv'])];
}
export function downloadMemberCodes(cards, activeOnly = true) {
  const url=URL.createObjectURL(new Blob([csvText(memberExportRows(cards,activeOnly))],{type:'text/csv;charset=utf-8'}));
  const link=document.createElement('a');link.href=url;link.download=`fc-kindmark-legea-${activeOnly ? 'aktiva' : 'alla'}-${stockholmToday()}.csv`;link.click();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
}
