import {invoiceSettlement} from './economy-settlements';
import {cents} from './economy';
export function documentPaymentState(document,data,today){
  if(!document || document.kind==='statement' || document.is_proforma || !Number.isFinite(Number(document.amount)) || cents(document.amount)<=0)
    return {key:'other',label:'Övrigt underlag',overdue:false};
  const settlement=invoiceSettlement(document,data);
  const paid=cents(settlement.remaining)===0;
  const overdue=!paid && Boolean(document.due_date) && document.due_date<today;
  return {key:paid?'paid':'unpaid',label:paid?'Betald':overdue?'Förfallen':settlement.paid>0?'Delbetald':'Obetald',overdue,...settlement};
}
