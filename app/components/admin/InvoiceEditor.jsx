"use client";
import {useState} from 'react';
import {Card,Button,Input,Select} from '../UI';
import {CLUB_SWISH,CLUB_BANKGIRO} from '../../lib/payments';
import {stockholmToday} from '../../lib/schedule';
import {money} from '../../lib/economy';
import {invoicePdfBytes,invoiceTotals} from '../../lib/invoice-pdf';
import {supabase} from '../../lib/supabaseClient';
const newInvoice=()=>({invoice_date:stockholmToday(),due_date:stockholmToday(),kind:'sales',partner_id:'',customer:'',customer_address:'',customer_org:'',customer_email:'',customer_reference:'',service_date:'',tax_mode:'exempt',tax_note:'Ingen moms debiteras. Föreningen är momsbefriad.',terms:'Betalas senast på förfallodagen.',note:'',items:[{description:'',quantity:1,unit_price:0}],seller:{name:'FC Kindmark Idrottsförening',org_no:'802555-1931',address:'Boråsvägen 256C, 511 70 Rydal',email:'info@fckindmark.se',bankgiro:CLUB_BANKGIRO,swish:CLUB_SWISH}});
export async function storeInvoicePdf(record,data){
 const d=data.documents.find(d=>d.id===record.document_id);if(!d)throw Error('Fakturaunderlaget saknas. Läs in ekonomin igen.');
 const blob=new Blob([invoicePdfBytes(record)],{type:'application/pdf'});
 const existing=await supabase.storage.from('club-economy').download(d.path);
 if(existing.error){const uploaded=await supabase.storage.from('club-economy').upload(d.path,blob,{contentType:'application/pdf',upsert:false});if(uploaded.error){const retry=await supabase.storage.from('club-economy').download(d.path);if(retry.error)throw uploaded.error;return retry.data;}}
 return existing.data || blob;
}
export default function InvoiceEditor({data,busy,run,onReload,onSettlement}){
 const [form,setForm]=useState(null);const [record,setRecord]=useState(null);
 const change=(key,value)=>setForm({...form,[key]:value});
 async function save(action){await run(async()=>{let current=record;
  if(action==='issue' && !current){const draft=await supabase.rpc('club_econ_invoice',{action:'save',p_payload:form});if(draft.error)throw draft.error;current=draft.data;setRecord(current);}
  const r=await supabase.rpc('club_econ_invoice',{action,p_payload:{...form,...(current?{id:current.id,updated_at:current.updated_at}:{})}});if(r.error)throw r.error;
  setRecord(r.data);setForm(r.data.status==='draft'?r.data.payload:null);
  const fresh=await onReload();if(action==='issue'){await storeInvoicePdf(r.data,fresh);setRecord(null);}
 });}
 async function download(i){await run(async()=>{const blob=await storeInvoicePdf(i,data);const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=i.payload.invoice_no+'.pdf';a.click();setTimeout(()=>URL.revokeObjectURL(url),10000);});}
 const totals=form?invoiceTotals(form.items,form.tax_mode):null;
 return <><div className="page-heading"><h3>Egna kundfakturor</h3><Button disabled={busy} onClick={()=>{setRecord(null);setForm(newInvoice());}}>+ Skapa faktura</Button></div>{form && <Card><form className="economy-form" onSubmit={e=>{e.preventDefault();save('save');}}><h3>Fakturautkast</h3><label>Typ<Select value={form.kind} onChange={e=>change('kind',e.target.value)}><option value="sales">Kundfaktura</option><option value="sponsor">Sponsorfaktura</option></Select></label><label>Sponsor<Select value={form.partner_id} onChange={e=>{const p=data.partners.find(p=>p.id===e.target.value);setForm({...form,partner_id:e.target.value,customer:p?.name || form.customer,kind:p?'sponsor':form.kind});}}><option value="">Ingen koppling</option>{data.partners.filter(p=>p.kind==='sponsor' && p.year===Number(form.invoice_date.slice(0,4))).map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</Select></label>
 {['customer','customer_address','customer_org','customer_email','customer_reference'].map((key,index)=><label key={key}>{['Kundens namn','Kundens adress och postort','Kundens org.nr (valfritt)','Kundens e-post (valfritt)','Er referens (valfritt)'][index]}<Input value={form[key]} onChange={e=>change(key,e.target.value)}/></label>)}
 {['invoice_date','due_date','service_date'].map((key,index)=><label key={key}>{['Fakturadatum','Förfallodatum','Leverans-/tjänstedatum (om annat än fakturadatum)'][index]}<Input type="date" value={form[key]} onChange={e=>change(key,e.target.value)}/></label>)}
 <p>Ingen moms debiteras. Föreningen är momsbefriad.</p><label>Text om momsbefrielse<Input value={form.tax_note} onChange={e=>change('tax_note',e.target.value)}/></label>
 <div className="invoice-items">{form.items.map((item,index)=><div className="invoice-item" key={index}>{['description','quantity','unit_price'].map((key,k)=><label key={key}>{['Beskrivning','Antal','À-pris SEK exkl. moms'][k]}<Input type={k?'number':'text'} step={key==='quantity'?'0.001':'0.01'} min={key==='quantity'?'0.001':'0'} value={item[key]} onChange={e=>change('items',form.items.map((i,n)=>n===index?{...i,[key]:e.target.value}:i))}/></label>)}<Button variant="secondary" disabled={form.items.length===1} onClick={()=>change('items',form.items.filter((_,n)=>n!==index))}>Ta bort rad</Button></div>)}<Button variant="secondary" disabled={form.items.length>=20} onClick={()=>change('items',[...form.items,{description:'',quantity:1,unit_price:0}])}>+ Fakturarad</Button></div>
 <p>Exkl. moms {money(totals.net)} · Moms {money(totals.vat)} · <strong>Att betala {money(totals.total)}</strong></p><label>Betalningsvillkor<Input value={form.terms} onChange={e=>change('terms',e.target.value)}/></label><label>Meddelande på fakturan<Input value={form.note} onChange={e=>change('note',e.target.value)}/></label>
 <details><summary>Förenings- och betalningsuppgifter</summary>{Object.keys(form.seller).map(key=><label key={key}>{({name:'Förening',org_no:'Organisationsnummer',address:'Adress',email:'E-post',vat_no:'Momsregistreringsnummer',bankgiro:'Bankgiro',swish:'Swish'})[key]}<Input value={form.seller[key]} onChange={e=>change('seller',{...form.seller,[key]:e.target.value})}/></label>)}</details>
 <p>Utställning ger ett eget löpnummer, skapar PDF-underlag och bokför kundfordran. PDF:en kan hämtas och skickas till kunden. Ingen e-post skickas här.</p><div className="economy-actions"><Button type="submit" disabled={busy}>Spara utkast</Button><Button disabled={busy} onClick={()=>{if(confirm('Ställ ut fakturan och bokför kundfordran? Uppgifterna låses; kontrollera moms och mottagare.'))save('issue');}}>Ställ ut faktura</Button><Button variant="secondary" disabled={busy} onClick={()=>{setForm(null);setRecord(null);}}>Stäng</Button></div></form></Card>}
 {(data.invoices || []).map(i=><Card key={i.id}><h3>{i.payload.invoice_no || 'Utkast'} · {i.payload.customer || 'Ny kund'}</h3><p>{i.status==='issued'?'Utställd':'Utkast'} · {i.payload.invoice_date} · {money(i.total)}</p><div className="economy-actions">{i.status==='draft'?<><Button disabled={busy} onClick={()=>{setForm(i.payload);setRecord(i);}}>Ändra</Button><Button variant="danger" disabled={busy} onClick={()=>{if(confirm('Ta bort fakturautkastet?'))run(async()=>{const r=await supabase.rpc('club_econ_invoice',{action:'delete',p_payload:{id:i.id,updated_at:i.updated_at}});if(r.error)throw r.error;await onReload();if(record?.id===i.id){setRecord(null);setForm(null);}});}}>Ta bort</Button></>:<><Button disabled={busy} onClick={()=>download(i)}>Hämta PDF</Button><Button variant="secondary" disabled={busy} onClick={()=>onSettlement(i.document_id)}>Inbetalningar</Button></>}</div></Card>)}
 </>;
}
