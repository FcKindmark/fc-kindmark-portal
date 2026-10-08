"use client";

import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { Card, Button, Input, Select, Modal } from '../UI';
import SettlementPanel from './SettlementPanel';
import { invoiceSettlement, incomingInvoice } from '../../lib/economy-settlements';
import { money, cents, parseCSV, decodeBankCSV, guessBankColumns, documentCandidates, documentBankProposal, bankRows, fingerprints, suggestAccount, entryForBank, report, matchedBank, journalRows, downloadCSV, downloadArchive } from '../../lib/economy';
import usePortalView from "../../lib/usePortalView";
import { readInvoice, invoicePartner } from '../../lib/economy-documents';
import { makeBackup, verifyBackup, downloadBackup } from '../../lib/economy-backup';
const today = () => new Intl.DateTimeFormat('sv-SE', {
  timeZone: 'Europe/Stockholm'
}).format(new Date());
const kinds = {
  purchase: 'Leverantörsfaktura',
  sales: 'Kundfaktura',
  sponsor: 'Sponsorunderlag',
  grant: 'Bidragsbeslut',
  receipt: 'Kvitto',
  statement: 'Bankutdrag'
};
const emptyEntry = () => ({
  date: today(),
  description: '',
  type: 'normal',
  bank_id: '',
  document_id: '',
  partner_id: '',
  lines: [{
    account: '1930',
    debit: '',
    credit: ''
  }, {
    account: '3901',
    debit: '',
    credit: ''
  }]
});
export default function EconomyTab({
  userId = "",
  payments = [],
  onPaymentsChanged,
  initialData = null,
  initialView = "overview"
}) {
  const [view, setView] = usePortalView("economy", ["overview","documents","bank","partners","journal","reports"], initialView, userId);
  const [savedYear, setSavedYear] = usePortalView("economyYear", Array.from({length:101},(_,i)=>String(2000+i)), today().slice(0,4), userId);
  const year=Number(savedYear);
  const setYear=value=>setSavedYear(String(value));
  const
    [data, setData] = useState(initialData || {
      accounts: [],
      partners: [],
      documents: [],
      bank: [],
      years: [],
      journal: [],
      lines: [],
      audit: [],
      payment_links: []
    }),
    [loading, setLoading] = useState(!initialData),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [notice, setNotice] = useState(''),
    [entry, setEntry] = useState(null),
    [settlement, setSettlement] = useState(null),
    [document, setDocument] = useState(null),
    [file, setFile] = useState(null),
    [partner, setPartner] = useState(null),
    [csv, setCSV] = useState(null),
    [mapping, setMapping] = useState({
      date: '',
      amount: '',
      description: '',
      reference: ''
    }),
    [preview, setPreview] = useState(null),
    [importFile, setImportFile] = useState(null),
    [bankBalance, setBankBalance] = useState(''),
    [reviewed, setReviewed] = useState(false),
    [reading, setReading] = useState(false),
    [readProgress, setReadProgress] = useState(''),
    [readText, setReadText] = useState('');
  async function load() {
    setLoading(true);
    try {
      const result = await supabase.rpc('club_econ_snapshot');
      if (result.error) throw result.error;
      setData(result.data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    load();
  }, []);
  const locked = Boolean(data.years.find(y => y.year === year)?.locked_at),
    summary = report(data.accounts, data.journal, data.lines, year);
  const yearBank = data.bank.filter(b => b.date.slice(0, 4) === String(year)),
    unmatched = yearBank.filter(b => !matchedBank(b, data.journal, data.lines)),
    yearJournal = data.journal.filter(j => j.year === year),
    yearDocuments = data.documents.filter(d => d.document_date.slice(0, 4) === String(year)),
    yearPartners = data.partners.filter(p => p.year === year);
  async function run(fn) {
    if (busy) return;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await fn();
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  async function upload(f) {
    if (!f) throw Error('Välj en fil');
    if (f.size > 15 * 1024 * 1024) throw Error('Filen får vara högst 15 MB');
    const path = `${crypto.randomUUID()}/${f.name.replace(/[^a-zA-Z0-9_.-]/g, '_')}`;
    const {
      error
    } = await supabase.storage.from('club-economy').upload(path, f, {
      upsert: false,
      contentType: ({pdf:'application/pdf',csv:'text/csv',jpg:'image/jpeg',jpeg:'image/jpeg',png:'image/png',xls:'application/vnd.ms-excel',xlsx:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'})[f.name.split('.').pop().toLowerCase()] || f.type
    });
    if (error) throw error;
    return path;
  }
  async function selectInvoice(f) {
    setFile(f); setReadText(''); setError('');
    if (!f || !/\.(pdf|png|jpe?g)$/i.test(f.name)) return;
    setDocument(previous => previous ? {...previous, partner_id:'', party:'', document_date:'', due_date:'', amount:'', reference:'', source_currency:'SEK', source_amount:'', is_proforma:false, conversion_note:''} : previous);
    setReading(true); setReadProgress('Förbereder läsning…');
    try {
      const result = await readInvoice(f, setReadProgress);
      const {original_amount, currency, proforma, ...fields} = result.fields;
      setDocument(previous => previous ? {...previous, ...fields, partner_id:invoicePartner({...previous,...fields},data.partners), source_currency:currency || 'SEK', source_amount:original_amount ?? fields.amount ?? '', is_proforma:Boolean(proforma), ...(currency ? {amount:''} : {})} : previous);
      setReadText(result.text);
      setNotice(`${Object.keys(result.fields).length} fält föreslagna. Kontrollera uppgifterna mot originalet och ändra vid behov.`);
    } catch (e) { setError(e.message); }
    finally { setReading(false); setReadProgress(''); }
  }
  async function backup() {
    await run(async () => {
      const fresh = await supabase.rpc('club_econ_snapshot');
      if (fresh.error) throw fresh.error;
      const audit = [];
      for (let offset=0;;offset+=1000) {
        const r = await supabase.from('club_econ_audit').select('*').order('id').range(offset,offset+999);
        if(r.error) throw r.error;
        audit.push(...r.data); if(r.data.length<1000) break;
      }
      const bytes = await makeBackup({...fresh.data,audit}, async path => {
        const r=await supabase.storage.from('club-economy').download(path);
        if(r.error) throw r.error; return r.data;
      },setNotice);
      downloadBackup(bytes);setNotice('ZIP-kopian är skapad och kontrollsummorna verifierade. Spara den på en annan enhet.');
    });
  }
  async function autoDrafts() {
    await run(async () => {
      const fresh=await supabase.rpc('club_econ_snapshot');
      if(fresh.error) throw fresh.error;
      const state=fresh.data;
      const rows=state.bank.filter(b=>b.date.slice(0,4)===String(year) && !matchedBank(b,state.journal,state.lines) && !state.journal.some(j=>j.bank_id===b.id && j.status==='draft'));
      let count=0;
      for(const b of rows) {
        const suggestion=suggestAccount(b,state.partners,payments);
        const r=await supabase.rpc('club_econ_bank_draft',{p_bank:b.id,p_proposal:entryForBank(b,suggestion)});
        if(r.error) throw Error(`${count} utkast skapade. ${r.error.message}`);
        if(r.data) count++;
      }
      setView('journal');setNotice(`${count} ändringsbara utkast skapade. Kontrollera konton, moms och betalningskopplingar före bokföring.`);
    });
  }
  async function saveDocument(e) {
    e.preventDefault();
    if (reading) return;
    await run(async () => {
      if (document.source_currency !== 'SEK' && !document.conversion_note?.trim()) throw Error('Ange underlag för omräkningen till SEK, exempelvis bankbetalning eller dokumenterad valutakurs.');
      let path = document.path;
      let uploaded = false;
      if (!path) {
        path = await upload(file);
        uploaded = true;
      }
      const payload = {
        ...document,
        path,
        name: document.name || file?.name,
        amount: Number(document.amount || 0),
        source_currency: (document.source_currency || 'SEK').trim().toUpperCase(),
        source_amount: document.source_amount === '' || document.source_amount == null ? null : Number(document.source_amount),
        is_proforma: Boolean(document.is_proforma),
        conversion_note: document.conversion_note || '',
        partner_id: document.partner_id || null,
        due_date: document.due_date || null
      };
      delete payload.created_at;
      const result = document.id ? await supabase.from('club_econ_documents').update(payload).eq('id', document.id).select('id').single() : await supabase.from('club_econ_documents').insert(payload).select('id').single();
      if (result.error) {
        if (uploaded) await supabase.storage.from('club-economy').remove([path]);
        throw result.error;
      }
      setDocument(null);
      setFile(null);
      if (['sales','sponsor','grant','purchase','receipt'].includes(payload.kind) && !payload.is_proforma) setSettlement({invoiceId:result.data.id});
      setNotice('Underlaget är sparat. Bokför med en verifikation när uppgifterna är kontrollerade.');
    });
  }
  async function openDocument(d) {
    await run(async () => {
      const {
        data: r,
        error: e
      } = await supabase.storage.from('club-economy').download(d.path);
      if (e) throw e;
      const url = URL.createObjectURL(r);
      const a = window.document.createElement('a');
      a.href = url;
      a.download = d.name;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 10000);
    });
  }
  function startBank(b) {
    const s = suggestAccount(b, data.partners, payments);
    setEntry({
      ...entryForBank(b, s),
      payment_ids: s.payment ? [s.payment.id] : []
    });
    setNotice(`Förslag: ${s.reason}. Kontrollera konto, moms och underlag innan bokföring.`);
  }
  function applyDocumentForBank(b, d) {
    setError('');
    try {
      const proposal = documentBankProposal(b, d, data.journal, data.lines, data.partners);
      setEntry(previous => previous?.bank_id === b.id ? {...previous, ...proposal} : proposal);
      setNotice('Fakturans koppling och kontering är föreslagna. Kontrollera betalaren, beloppet och eventuell moms före bokföring.');
    } catch (e) { setError(e.message); }
  }
  function fromDocument(d) {
    if (d.is_proforma || !(Number(d.amount)>0)) { setError('Komplettera med slutfaktura och ett giltigt SEK-belopp före konteringsförslag.'); return; }
    const incoming = ['sales', 'sponsor', 'grant'].includes(d.kind),
      account = d.kind === 'sponsor' ? '3910' : d.kind === 'grant' ? '3980' : incoming ? '3990' : '6990';
    setEntry({
      ...emptyEntry(),
      date: d.document_date,
      description: `${kinds[d.kind]} · ${d.party} · ${d.reference}`,
      document_id: d.id,
      partner_id: d.partner_id || '',
      lines: incoming ? [{
        account: '1510',
        debit: d.amount,
        credit: 0
      }, {
        account,
        debit: 0,
        credit: d.amount
      }] : [{
        account,
        debit: d.amount,
        credit: 0
      }, {
        account: '2440',
        debit: 0,
        credit: d.amount
      }]
    });
    setNotice('Fakturaförslag: fordran eller skuld. Vid senare betalning används 1510 eller 2440 som motkonto så intäkten/kostnaden inte bokförs två gånger.');
  }
  async function saveEntry(action) {
    await run(async () => {
      const payload = {
        ...entry,
        lines: entry.lines.map(l => ({
          account: l.account,
          debit: Number(l.debit || 0),
          credit: Number(l.credit || 0)
        }))
      };
      const {error: e} = entry.correction_of ? await supabase.rpc('club_econ_correct', {p_original: entry.correction_of, p_reason: entry.reason, p_replacement: payload}) : await supabase.rpc('club_econ_entry', {action, payload});
      if (e) throw e;
      await onPaymentsChanged?.();
      setEntry(null);
      setNotice(action === 'post' ? 'Verifikationen är bokförd.' : 'Utkastet är sparat.');
    });
  }
  async function removeDraft(j) {
    if (!confirm('Ta bort detta utkast?')) return;
    await run(async () => {
      const {
        error: e
      } = await supabase.rpc('club_econ_entry', {
        action: 'delete',
        payload: {
          id: j.id
        }
      });
      if (e) throw e;
    });
  }
  async function reverse(j) {
    const reason = prompt('Orsak till rättelsen (originalet bevaras):');
    if (!reason) return;
    await run(async () => {
      const {
        error: e
      } = await supabase.rpc('club_econ_entry', {
        action: 'reverse',
        payload: {
          id: j.id,
          date: j.date,
          reason
        }
      });
      if (e) throw e;
      await onPaymentsChanged?.();
      setNotice('Motverifikation skapad. Skapa därefter en ny korrekt verifikation vid behov.');
    });
  }
  function edit(j) {
    setEntry({
      ...j,
      id: j.status === 'posted' ? undefined : j.id,
      correction_of: j.status === 'posted' ? j.id : undefined,
      reason: '',
      payment_ids: data.settlement_selections?.find(s=>s.journal_id===j.id)?.payment_ids || data.payment_links.filter(l=>l.journal_id===j.id).map(l=>l.payment_id),
      document_allocations: (data.document_links || []).filter(a=>a.journal_id===j.id).map(a=>({document_id:a.document_id,amount:a.amount,account:a.account})),
      lines: data.lines.filter(l => l.journal_id === j.id).map(l => ({
        account: l.account,
        debit: l.debit,
        credit: l.credit
      }))
    });
  }
  async function prepareImport() {
    setError('');
    try {
      const rows = await fingerprints(bankRows(csv, mapping));
      if (rows.length > 2000) throw Error('Importera högst 2 000 bankrader åt gången');
      setPreview(rows);
    } catch (e) {
      setError(e.message);
    }
  }
  async function importBank() {
    await run(async () => {
      const existing = new Set(data.bank.map(b => b.fingerprint)),
        rows = preview.filter(r => !existing.has(r.fingerprint)).map(r => ({
          ...r,
          import_name: importFile.name
        }));
      if (!rows.length) throw Error('Alla dessa bankrader är redan importerade');
      const path = await upload(importFile);
      const doc = await supabase.from('club_econ_documents').insert({
        name: importFile.name,
        path,
        kind: 'statement',
        party: 'Bankutdrag',
        document_date: rows[0].date,
        amount: 0,
        reference: 'CSV-import'
      }).select('id').single();
      if (doc.error) {
        await supabase.storage.from('club-economy').remove([path]);
        throw doc.error;
      }
      const {
        error: e
      } = await supabase.from('club_econ_bank').upsert(rows.map(r => ({
        ...r,
        statement_document: doc.data.id
      })), {
        onConflict: 'fingerprint',
        ignoreDuplicates: true
      });
      if (e) throw e;
      setCSV(null);
      setPreview(null);
      setImportFile(null);
      const imported = await supabase.from('club_econ_bank').select('*').eq('statement_document',doc.data.id);
      if(imported.error) throw imported.error;
      let drafts=0;
      for(const b of imported.data) {
        const r=await supabase.rpc('club_econ_bank_draft',{p_bank:b.id,p_proposal:entryForBank(b,suggestAccount(b,data.partners,payments))});
        if(r.error) throw Error(`Bankraderna är sparade; ${drafts} utkast skapade. ${r.error.message}. Använd Skapa alla konteringsförslag för att fortsätta.`);
        if(r.data) drafts++;
      }
      setNotice(`${rows.length} bankrader behandlade och ${drafts} ändringsbara konteringsförslag skapade automatiskt. Öppna Bokföring för kontroll och bekräftelse.`);
    });
  }
  async function lockYear() {
    if (!reviewed || bankBalance === '') return;
    if (!confirm(`Lås ${year}? Verifikationer i året kan därefter inte ändras. Årsbokslutet ska fortfarande granskas och signeras separat.`)) return;
    await run(async () => {
      const {
        error: e
      } = await supabase.rpc('club_econ_lock_year', {
        p_year: year,
        p_balance: Number(bankBalance)
      });
      if (e) throw e;
      setNotice('Året är låst. Exportera bokslutsunderlaget för granskning och signering.');
    });
  }
  const balance = entry ? entry.lines.reduce((s, l) => s + cents(l.debit) - cents(l.credit), 0) : 0;
  const partnerReceived = p => {
    const ids = new Set(data.journal.filter(j => j.partner_id === p.id && j.status === 'posted' && j.year === year).map(j => j.id));
    const legacy=data.lines.filter(l => ids.has(l.journal_id) && l.account === '1930').reduce((s,l)=>s+cents(l.debit)-cents(l.credit),0);
    const allocated=(data.document_links || []).filter(a=>data.documents.some(d=>d.id===a.document_id && d.partner_id===p.id) && data.journal.some(j=>j.id===a.journal_id && j.status==='posted' && j.bank_id && j.year===year && !ids.has(j.id))).reduce((n,a)=>n+cents(a.amount),0);
    return (legacy+allocated)/100;
  };
  return <section className="economy">{settlement && <Modal isOpen onClose={()=>!busy && setSettlement(null)} title={settlement.invoiceId ? (incomingInvoice(data.documents.find(d=>d.id===settlement.invoiceId) || {}) ? 'Inbetalningar' : 'Utbetalningar') : 'Stäm av konto'}>
  <SettlementPanel key={settlement.invoiceId || settlement.bankId} data={data} payments={payments} invoice={data.documents.find(d=>d.id===settlement.invoiceId)} initialBank={data.bank.find(b=>b.id===settlement.bankId)} busy={busy} error={error} onManual={b=>{const draft=data.journal.find(j=>j.bank_id===b.id && j.status==='draft');if(draft)edit(draft);else startBank(b);setSettlement(null);}} onSave={(proposal,action)=>{
    if(action==='post' && !confirm('Bekräfta fördelningen och bokför banktransaktionen?'))return;
    run(async()=>{
      const draft=data.journal.find(j=>j.bank_id===proposal.bank_id && j.status==='draft');
      const {remaining,...payload}=proposal;
      const result=await supabase.rpc('club_econ_entry',{action,payload:{...payload,...(draft?{id:draft.id}:{})}});
      if(result.error)throw result.error;
      await onPaymentsChanged?.();setSettlement(null);setNotice(action==='post'?'Avstämningen är bokförd. Fakturor och medlemsbetalningar är uppdaterade.':'Fördelningen är sparad som utkast.');
    });
  }} />
</Modal>}<div className="page-heading"><div><h1>Ekonomi</h1><p>FC Kindmark · underlag, bank och bokföring</p></div><label>Kalenderår<Select value={year} onChange={e => {
          setYear(Number(e.target.value));
          setReviewed(false);
        }}>{Array.from(new Set([year, ...data.years.map(y => y.year), ...data.bank.map(b => Number(b.date.slice(0, 4))), 2026, 2027, 2028])).sort().map(y => <option key={y}>{y}</option>)}</Select></label></div>
 <div className="economy-tabs" role="group" aria-label="Ekonomisidor">{[['overview', 'Översikt'], ['documents', 'Fakturor & kvitton'], ['bank', 'Stäm av konto'], ['partners', 'Sponsorer & stöd'], ['journal', 'Bokföring'], ['reports', 'Rapporter & bokslut']].map(([id, label]) => <Button key={id} variant={view === id ? 'primary' : 'secondary'} aria-pressed={view === id} onClick={() => {
        setView(id);
        setEntry(null);
      }}>{label}</Button>)}</div>
 {error && <p className="error-banner" role="alert">{error}</p>}{notice && <p className="economy-notice" role="status">{notice}</p>}{locked && <p className="economy-notice">{year} är låst.</p>}
 {loading ? <p role="status">Läser ekonomin…</p> : <>
 {view === 'overview' && <><div className="economy-stats">{[['Intäkter', summary.income], ['Kostnader', summary.expense], ['Resultat', summary.result], ['Bokfört banksaldo', summary.bank]].map(([label, n]) => <Card key={label}><span>{label}</span><strong>{money(n / 100)}</strong></Card>)}</div><Card><h2>Bankutdrag · {year}</h2><p>Inbetalt: <strong>{money(yearBank.filter(b=>b.amount>0).reduce((total,b)=>total+Number(b.amount),0))}</strong> · Utbetalt: <strong>{money(-yearBank.filter(b=>b.amount<0).reduce((total,b)=>total+Number(b.amount),0))}</strong></p><p>Faktiska bankrörelser från importerade utdrag; kostnader ovan räknas från bokföringen.</p><h2>Att göra</h2><p>{unmatched.length} bankrader att stämma av · {yearJournal.filter(j => j.status === 'draft').length} utkast · {yearDocuments.length} underlag</p><div className="economy-actions"><Button onClick={() => setView('documents')}>Lägg till faktura eller kvitto</Button><Button variant="secondary" onClick={() => setView('bank')}>Importera bankutdrag</Button></div><p>Beloppen räknas endast från bokförda verifikationer. Medlemsavgifter i Betalningar är betalningskrav och räknas inte som en extra intäkt här.</p></Card></>}
 {view === 'documents' && <><div className="page-heading"><h2>Fakturor och kvitton</h2><Button disabled={reading} onClick={() => {
            setReadText('');
            setDocument({
              kind: 'purchase',
              party: '',
              document_date: today(),
              due_date: '',
              amount: '',
              reference: '',
              partner_id: '', source_currency:'SEK', source_amount:'', is_proforma:false, conversion_note:''
            });
            setFile(null);
          }}>+ Lägg till underlag</Button></div><p>PDF, foto, CSV eller Excel. Fakturauppgifter registreras här; PDF och foton läses automatiskt på din enhet. Föreslagna fält kan ändras före sparande.</p>{document && <Card><form onSubmit={saveDocument} className="economy-form"><h3>{document.id ? 'Ändra underlag' : 'Nytt underlag'}</h3><fieldset disabled={reading} style={{border:0,padding:0,display:"contents"}}>{!document.id && <label>Fil<Input required type="file" accept=".pdf,.jpg,.jpeg,.png,.csv,.xlsx,.xls" disabled={reading || busy} onChange={e => selectInvoice(e.target.files[0])} /></label>}<p role="status">{readProgress}</p>{document.source_currency && document.source_currency !== 'SEK' && <p className="economy-notice">Fakturan är i {document.source_currency}. Bokföringsbeloppet anges i SEK med dokumenterad omräkning.</p>}{document.is_proforma && <p className="economy-notice">Proformafaktura: komplettera med slutfaktura innan du bokför fakturan.</p>}{readText && <details><summary>Visa läst text för kontroll</summary><pre style={{whiteSpace:"pre-wrap"}}>{readText}</pre></details>}<label>Typ<Select disabled={reading} value={document.kind} onChange={e => setDocument({
                ...document,
                kind: e.target.value
              })}>{Object.entries(kinds).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</Select></label><label>Leverantör / kund<Input required value={document.party} onChange={e => setDocument({
                ...document,
                party: e.target.value
              })} /></label><label>Datum<Input required type="date" value={document.document_date} onChange={e => setDocument({
                ...document,
                document_date: e.target.value
              })} /></label><label>Förfallodatum<Input type="date" value={document.due_date || ''} onChange={e => setDocument({
                ...document,
                due_date: e.target.value
              })} /></label><label>Originalvaluta<Input required pattern="[A-Za-z]{3}" maxLength={3} value={document.source_currency || 'SEK'} onChange={e=>setDocument({...document,source_currency:e.target.value.toUpperCase()})} /></label><label>Originalbelopp<Input type="number" min="0" step="0.01" value={document.source_amount ?? ''} onChange={e=>setDocument({...document,source_amount:e.target.value})} /></label><label className="economy-check"><input type="checkbox" checked={Boolean(document.is_proforma)} onChange={e=>setDocument({...document,is_proforma:e.target.checked})} /> Proformafaktura</label>{document.source_currency !== 'SEK' && <><label>Hämta SEK-belopp från bankbetalning<Select value="" onChange={e=>{const b=data.bank.find(b=>b.id===e.target.value);if(b)setDocument({...document,amount:Math.abs(b.amount),conversion_note:`Bankbetalning ${b.date} · ${b.reference || b.description} · ${Math.abs(b.amount)} SEK`});}}><option value="">Välj betalning efter kontroll</option>{data.bank.filter(b=>['sales','sponsor','grant'].includes(document.kind) ? b.amount>0 : b.amount<0).map(b=><option key={b.id} value={b.id}>{b.date} · {b.description} · {money(b.amount)}</option>)}</Select></label><label>Underlag för valutaomräkning<Input required value={document.conversion_note || ''} onChange={e=>setDocument({...document,conversion_note:e.target.value})} placeholder="Bankbetalning eller dokumenterad valutakurs" /></label></>}<label>Totalbelopp SEK<Input required type="number" min="0" step="0.01" value={document.amount} onChange={e => setDocument({
                ...document,
                amount: e.target.value
              })} /></label><label>Fakturanummer / referens<Input value={document.reference} onChange={e => setDocument({
                ...document,
                reference: e.target.value
              })} /></label><label>Sponsor / bidragsgivare<Select value={document.partner_id || ''} onChange={e => setDocument({
                ...document,
                partner_id: e.target.value
              })}><option value="">Ingen koppling</option>{data.partners.map(p => <option key={p.id} value={p.id}>{p.name} · {p.year}</option>)}</Select></label><div className="economy-actions"><Button type="submit" disabled={busy || reading}>Spara underlag</Button><Button variant="secondary" disabled={reading} onClick={() => setDocument(null)}>Avbryt</Button></div></fieldset></form></Card>}{yearDocuments.map(d => {
          const booked = data.journal.some(j => j.document_id === d.id && j.status === 'posted') || (data.document_links || []).some(a=>a.document_id===d.id && data.journal.some(j=>j.id===a.journal_id && j.status==='posted'));
          return <Card key={d.id}><div className="page-heading"><div><h3>{d.party || d.name}</h3><p>{kinds[d.kind]} · {d.document_date} · {d.reference}</p></div><div><strong>{money(d.amount)}</strong>{d.source_currency !== 'SEK' && d.source_amount != null && <p>Original: {d.source_amount} {d.source_currency}</p>}{d.is_proforma && <p>Proformafaktura</p>}</div></div>{d.partner_id && <p>Kopplat till {data.partners.find(p=>p.id===d.partner_id)?.name || 'sponsor / bidragsgivare'}</p>}{d.conversion_note && <p>{d.conversion_note}</p>}{d.kind!=='statement' && !d.is_proforma && <p>{incomingInvoice(d)?'Inbetalt':'Utbetalt'}: {money(invoiceSettlement(d,data).paid)} · Kvar: <strong>{money(invoiceSettlement(d,data).remaining)}</strong></p>}<p>{booked ? 'Kopplat till bokföring' : 'Ej bokfört'}{d.due_date ? ` · Förfallodatum ${d.due_date}` : ''}</p><div className="economy-actions">{!d.is_proforma && d.kind!=='statement' && Number(d.amount)>0 && <Button onClick={()=>{setError('');setSettlement({invoiceId:d.id});}}>{incomingInvoice(d)?'Inbetalningar':'Utbetalningar'}</Button>}<details><summary>Hantera faktura</summary><Button variant="secondary" disabled={busy} onClick={() => openDocument(d)}>Hämta fil</Button>{!locked && !booked && <><Button variant="secondary" onClick={() => {
                  setDocument(d);
                  setReadText('');
                  setFile(null);
                }}>Ändra</Button>{d.kind !== 'statement' && !d.is_proforma && Number(d.amount)>0 && <Button onClick={() => fromDocument(d)}>Bokför fakturan först / moms</Button>}<Button variant="danger" onClick={() => {
                  if (confirm('Ta bort underlaget?')) run(async () => {
                    const {
                      error: e
                    } = await supabase.from('club_econ_documents').delete().eq('id', d.id).select('id').single();
                    if (e) throw e;
                    const {
                      error: se
                    } = await supabase.storage.from('club-economy').remove([d.path]);
                    if (se) throw se;
                  });
                }}>Ta bort</Button></>}</details></div></Card>;
        })}</>}
 {view === 'bank' && <><h2>Bankutdrag · konto 1930</h2><Card><label>Importera bankens CSV<Input type="file" accept=".csv" disabled={busy || locked} onChange={async e => {
              setError('');
              try {
                const f = e.target.files[0];
                if (!f) return;
                if (f.size > 5 * 1024 * 1024) throw Error('CSV-filen får vara högst 5 MB');
                setCSV(null); setPreview(null); setImportFile(null);
                const parsed = parseCSV(decodeBankCSV(await f.arrayBuffer()));
                const detected = guessBankColumns(parsed.headers);
                setCSV(parsed); setImportFile(f); setMapping(detected);
                if (detected.date !== '' && detected.amount !== '') {
                  const rows = bankRows(parsed, detected);
                  if (rows.length > 2000) throw Error('Importera högst 2 000 bankrader åt gången');
                  setPreview(await fingerprints(rows));
                  setNotice('Bankformatet känns igen. Kontrollera raderna och bekräfta importen.');
                }
              } catch (err) {
                setError(err.message);
              }
            }} /></label><p>Datumformat ÅÅÅÅ-MM-DD. Belopp ska vara positivt för inbetalningar och negativt för utbetalningar. PDF-utdrag kan sparas som underlag; CSV används för automatisk radimport.</p>{csv && <><details><summary>Ändra kolumner vid behov</summary><div className="economy-form">{[['date', 'Datum'], ['amount', 'Belopp med tecken'], ['description', 'Beskrivning'], ['reference', 'Referens']].map(([key, label]) => <label key={key}>{label}<Select value={mapping[key]} onChange={e => {
                  setMapping({
                    ...mapping,
                    [key]: e.target.value
                  });
                  setPreview(null);
                }}><option value="">Välj kolumn</option>{csv.headers.map((h, i) => <option key={i} value={i}>{h}</option>)}</Select></label>)}</div><Button disabled={busy} onClick={prepareImport}>Förhandsgranska</Button></details></>}{preview && <><p>{preview.length} rader · {preview.filter(r => data.bank.some(b => b.fingerprint === r.fingerprint)).length} redan importerade. Överlappande utdrag matchas på datum, belopp, text och referens; kontrollera identiska transaktioner.</p><div className="economy-table"><table><thead><tr><th>Datum</th><th>Text</th><th>Belopp</th></tr></thead><tbody>{preview.slice(0, 20).map((r, i) => <tr key={i}><td>{r.date}</td><td>{r.description}</td><td>{money(r.amount)}</td></tr>)}</tbody></table></div><Button disabled={busy || locked} onClick={importBank}>Bekräfta import</Button></>}</Card><h3>{unmatched.length} transaktioner att bokföra</h3><Button disabled={busy || locked || !unmatched.length} onClick={autoDrafts}>Skapa alla konteringsförslag</Button><p>Förslagen sparas som ändringsbara utkast. Bekräfta varje verifikation efter kontroll.</p>{yearBank.map(b => {
          const done = matchedBank(b, data.journal, data.lines);
          return <Card key={b.id}><div className="page-heading"><div><strong>{b.description || b.reference || 'Banktransaktion'}</strong><p>{b.date} · {b.reference} · {done ? 'Avstämd' : 'Ej avstämd'}</p></div><strong>{money(b.amount)}</strong></div>{!done && !locked && <Button disabled={busy} onClick={()=>{setError('');setSettlement({bankId:b.id});}}>Stäm av</Button>}</Card>;
        })}</>}
 {view === 'partners' && <><div className="page-heading"><h2>Sponsorer och bidrag</h2><Button onClick={() => setPartner({
            name: '',
            kind: 'sponsor',
            agreed_amount: '',
            year,
            note: ''
          })}>+ Lägg till sponsor / stöd</Button></div>{partner && <Card><form className="economy-form" onSubmit={e => {
            e.preventDefault();
            run(async () => {
              const payload = {
                ...partner,
                agreed_amount: Number(partner.agreed_amount || 0)
              };
              const r = partner.id ? await supabase.from('club_econ_partners').update(payload).eq('id', partner.id).select('id').single() : await supabase.from('club_econ_partners').insert(payload).select('id').single();
              if (r.error) throw r.error;
              setPartner(null);
            });
          }}><label>Namn<Input required value={partner.name} onChange={e => setPartner({
                ...partner,
                name: e.target.value
              })} /></label><label>Typ<Select value={partner.kind} onChange={e => setPartner({
                ...partner,
                kind: e.target.value
              })}><option value="sponsor">Sponsor</option><option value="grant">Bidrag / stöd</option></Select></label><label>Avtalat belopp SEK<Input type="number" min="0" step="0.01" value={partner.agreed_amount} onChange={e => setPartner({
                ...partner,
                agreed_amount: e.target.value
              })} /></label><label>Anteckning<Input value={partner.note} onChange={e => setPartner({
                ...partner,
                note: e.target.value
              })} /></label><div className="economy-actions"><Button type="submit" disabled={busy}>Spara</Button><Button variant="secondary" onClick={() => setPartner(null)}>Avbryt</Button></div></form></Card>}<p>{yearPartners.filter(p => p.kind === 'sponsor').length} sponsorer · {yearPartners.filter(p => p.kind === 'grant').length} bidragsgivare. Mottaget räknas från bokförda bankrader som kopplats till parten.</p>{yearPartners.map(p => <Card key={p.id}><h3>{p.name}</h3><p>{p.kind === 'sponsor' ? 'Sponsor' : 'Bidrag / stöd'} · Avtalat {money(p.agreed_amount)} · Mottaget {money(partnerReceived(p))}</p><p>Fakturerat: {money(yearDocuments.filter(d=>d.partner_id===p.id && d.kind==='sponsor' && !d.is_proforma).reduce((total,d)=>total+Number(d.amount),0))} · {yearDocuments.filter(d=>d.partner_id===p.id).length} underlag</p><p>{p.note}</p><div className="economy-actions"><Button variant="secondary" onClick={() => setPartner(p)}>Ändra</Button><Button variant="danger" disabled={busy} onClick={() => {
              if (confirm('Ta bort? Kopplade underlag och verifikationer måste bevaras.')) run(async () => {
                const {
                  error: e
                } = await supabase.from('club_econ_partners').delete().eq('id', p.id).select('id').single();
                if (e) throw e;
              });
            }}>Ta bort</Button></div></Card>)}</>}
 {view === 'journal' && <><div className="page-heading"><h2>Verifikationer</h2><Button disabled={locked} onClick={() => setEntry(emptyEntry())}>+ Ny verifikation</Button></div><p>Bokförda poster bevaras. Rättelse skapar motsatta debet/kredit-rader och behåller originalet.</p>{yearJournal.map(j => <Card key={j.id}><strong>{j.status === 'posted' ? `${j.year}-${j.number}` : 'Utkast'} · {j.description}</strong><p>{j.date}{j.reversal_of ? ' · Motverifikation' : ''}</p><details><summary>Visa kontering</summary>{data.lines.filter(l => l.journal_id === j.id).map(l => <p key={l.id}>{l.account} · Debet {money(l.debit)} · Kredit {money(l.credit)}</p>)}</details>{!locked && <div className="economy-actions">{j.status === 'draft' ? <><Button onClick={() => edit(j)}>Öppna / ändra</Button><Button variant="danger" disabled={busy} onClick={() => removeDraft(j)}>Ta bort utkast</Button></> : !j.reversal_of && !data.journal.some(r => r.reversal_of === j.id) && <><Button disabled={busy} onClick={() => edit(j)}>Ändra / rätta</Button><Button variant="secondary" disabled={busy} onClick={() => reverse(j)}>Rätta med motverifikation</Button></>}</div>}</Card>)}</>}
 {entry && <Card className="economy-editor"><h2>{entry.correction_of ? "Ändra bokförd verifikation" : "Kontrollera kontering"}</h2>{entry.correction_of && <label>Orsak till ändring<Input required value={entry.reason} onChange={e=>setEntry({...entry,reason:e.target.value})} /><p>Originalet bevaras. Motverifikation och den ändrade posten bokförs tillsammans när du bekräftar.</p></label>}<div className="economy-form"><label>Datum<Input type="date" value={entry.date} disabled={Boolean(entry.bank_id)} onChange={e => setEntry({
              ...entry,
              date: e.target.value
            })} /></label><label>Beskrivning<Input value={entry.description} onChange={e => setEntry({
              ...entry,
              description: e.target.value
            })} /></label><label>Typ<Select value={entry.type} onChange={e => setEntry({
              ...entry,
              type: e.target.value
            })}><option value="normal">Vanlig verifikation</option><option value="opening">Ingående balans</option></Select></label><label>Underlag<Select value={entry.document_id || ''} onChange={e => setEntry({
              ...entry,
              document_id: e.target.value
            })}><option value="">Välj underlag</option>{data.documents.map(d => <option value={d.id} key={d.id}>{d.party} · {d.reference} · {d.name}</option>)}</Select></label><label>Sponsor / bidrag<Select value={entry.partner_id || ''} onChange={e => setEntry({
              ...entry,
              partner_id: e.target.value
            })}><option value="">Ingen koppling</option>{data.partners.filter(p => p.year === Number(entry.date.slice(0, 4))).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</Select></label></div>{entry.bank_id && entry.document_id && <Button variant="secondary" onClick={()=>applyDocumentForBank(data.bank.find(b=>b.id===entry.bank_id),data.documents.find(d=>d.id===entry.document_id))}>Använd valt underlags konteringsförslag</Button>}<p>Kontrollera om beloppet ska delas på medlem, träning, kläder eller moms. En betald faktura bokförs mot fordran/skuld, inte som en ny intäkt/kostnad.</p>{entry.lines.map((l, i) => <div className="economy-line" key={i}><label>Konto<Select value={l.account} onChange={e => setEntry({
              ...entry,
              lines: entry.lines.map((x, k) => k === i ? {
                ...x,
                account: e.target.value
              } : x)
            })}>{data.accounts.map(a => <option key={a.code} value={a.code}>{a.code} · {a.name}</option>)}</Select></label>{['debit', 'credit'].map(key => <label key={key}>{key === 'debit' ? 'Debet' : 'Kredit'}<Input type="number" min="0" step="0.01" value={l[key]} onChange={e => setEntry({
              ...entry,
              lines: entry.lines.map((x, k) => k === i ? {
                ...x,
                [key]: e.target.value
              } : x)
            })} /></label>)}<Button variant="secondary" onClick={() => setEntry({
            ...entry,
            lines: entry.lines.filter((_, k) => k !== i)
          })} aria-label={`Ta bort konteringsrad ${i + 1}`}>×</Button></div>)}<Button variant="secondary" onClick={() => setEntry({
          ...entry,
          lines: [...entry.lines, {
            account: '3901',
            debit: '',
            credit: ''
          }]
        })}>+ Dela belopp / lägg till rad</Button>{entry.bank_id && data.bank.find(b => b.id === entry.bank_id)?.amount > 0 && <details><summary>Koppla och bekräfta medlemsbetalningar</summary><p>Välj hela betalningar som ingår i bankbeloppet. En delbetalning lämnas utan denna koppling tills hela avgiften är betald.</p>{payments.filter(p => !data.payment_links.some(l => l.payment_id === p.id && l.journal_id !== entry.correction_of && !data.journal.some(j => j.reversal_of === l.journal_id))).map(p => <label className="economy-check" key={p.id}><input type="checkbox" checked={(entry.payment_ids || []).includes(p.id)} onChange={e => setEntry({
              ...entry,
              payment_ids: e.target.checked ? [...(entry.payment_ids || []), p.id] : (entry.payment_ids || []).filter(id => id !== p.id)
            })} />{p.player_name} · {p.description} · {money(p.amount)} · {p.reference}</label>)}</details>}<p>Skillnad debet–kredit: <strong>{money(balance / 100)}</strong></p><div className="economy-actions"><Button variant="secondary" disabled={busy || balance !== 0 || Boolean(entry.correction_of)} onClick={() => saveEntry('save')}>Spara utkast</Button><Button disabled={busy || balance !== 0} onClick={() => {
            if (entry.correction_of && entry.reason.trim().length < 3) { setError('Ange orsak till ändringen'); return; }
            if (confirm('Bokför den kontrollerade verifikationen? Originalet kommer att bevaras.')) saveEntry('post');
          }}>Bekräfta och bokför</Button><Button variant="secondary" onClick={() => setEntry(null)}>Avbryt</Button></div></Card>}
 {view === 'reports' && <><div className="page-heading"><h2>Rapporter · {year}</h2><div className="economy-actions"><Button variant="secondary" onClick={() => downloadCSV(`kindmark-huvudbok-${year}.csv`, journalRows(yearJournal, data.lines, data.accounts))}>Exportera huvudbok</Button><Button variant="secondary" onClick={() => run(async () => {
              const audit = [];
              for (let offset = 0;; offset += 1000) {
                const r = await supabase.from('club_econ_audit').select('*').order('id').range(offset, offset + 999);
                if (r.error) throw r.error;
                audit.push(...r.data);
                if (r.data.length < 1000) break;
              }
              downloadArchive({
                ...data,
                audit
              });
            })}>Exportera ekonomidata (JSON)</Button><Button disabled={busy} variant="secondary" onClick={backup}>Hämta komplett säkerhetskopia (ZIP)</Button><Button onClick={() => window.print()}>Skriv ut / spara PDF</Button></div></div><p>Rapporterna bygger på bokförda poster. Bokslutsunderlag för granskning, komplettering och signering; ingen färdig skattedeklaration. JSON-exporten innehåller ekonomidata och filreferenser; originalfiler hämtas separat under Fakturor & kvitton.</p><Card><h3>Resultaträkning</h3>{summary.accounts.filter(a => ['income', 'expense'].includes(a.kind)).map(a => <div className="economy-report-row" key={a.code}><span>{a.code} · {a.name}</span><strong>{money((a.kind === 'income' ? -a.change : a.change) / 100)}</strong></div>)}<div className="economy-report-row"><strong>Årets resultat</strong><strong>{money(summary.result / 100)}</strong></div></Card><Card><h3>Balansräkning · 31 december</h3>{summary.accounts.filter(a => !['income', 'expense'].includes(a.kind)).map(a => <div className="economy-report-row" key={a.code}><span>{a.code} · {a.name}</span><strong>{money((a.kind === 'asset' ? a.closing : -a.closing) / 100)}</strong></div>)}<div className="economy-report-row"><span>Tidigare resultat, ej omfört</span><strong>{money(summary.priorResult / 100)}</strong></div><div className="economy-report-row"><span>Årets resultat</span><strong>{money(summary.result / 100)}</strong></div><div className="economy-report-row"><strong>Tillgångar</strong><strong>{money(summary.assets / 100)}</strong></div><div className="economy-report-row"><strong>Eget kapital och skulder, inklusive resultat</strong><strong>{money((summary.equity + summary.liabilities + summary.priorResult + summary.result) / 100)}</strong></div><p>Balansdifferens: {money(summary.difference / 100)}</p></Card><Card className="no-print"><h3>Årsbokslut · underlag och avstämning</h3><p>{unmatched.length} bankrader kvar · {yearJournal.filter(j => j.status === 'draft').length} utkast. Ange ingående balans, stäm av skulder/fordringar och komplettera med periodiseringar, inventarier och moms där det behövs.</p><label>Bankens saldo 31 december, SEK<Input type="number" step="0.01" value={bankBalance} onChange={e => setBankBalance(e.target.value)} disabled={locked} /></label><label className="economy-check"><input type="checkbox" checked={reviewed} disabled={locked} onChange={e => setReviewed(e.target.checked)} /> Jag har granskat underlag, ingående balans, fordringar, skulder och årsslutsjusteringar.</label><Button disabled={busy || locked || !reviewed || bankBalance === '' || unmatched.length > 0 || yearJournal.some(j => j.status === 'draft')} onClick={lockYear}>Lås kontrollerat år</Button><Button variant="secondary" onClick={() => downloadCSV(`kindmark-bokslutsunderlag-${year}.csv`, [['Rapport', 'Konto', 'Namn', 'Ingående balans', 'Årets förändring', 'Utgående balans'], ...summary.accounts.map(a => [a.kind, a.code, a.name, a.opening / 100, a.change / 100, a.closing / 100]), ['Resultat', '', 'Årets resultat', '', summary.result / 100, '']])}>Exportera bokslutsunderlag</Button></Card><Card className="no-print"><h3>Kontrollera säkerhetskopia</h3><p>Välj den ZIP-kopia du laddat ner. Kontrollsummor och originalfiler kontrolleras utan att ändra några betalningar eller bokföringsposter.</p><Input type="file" accept=".zip" disabled={busy} onChange={e => {
 const f=e.target.files[0]; if(!f) return;
 run(async()=>{ if(f.size>101*1024*1024) throw Error('Arkivet är för stort'); const result=await verifyBackup(new Uint8Array(await f.arrayBuffer())); setNotice(`Kopian är hel: ${result.documents} originalunderlag och ${result.journal} verifikationer. Exporterad ${result.exported_at}. Återställning till databasen utförs separat.`); }); e.target.value='';
}} /></Card><Card className="no-print"><h3>Ändringshistorik</h3>{data.audit.slice(0, 20).map(a => <p key={a.id}>{new Date(a.at).toLocaleString('sv-SE')} · {a.action} · {a.entity} · användare {a.actor}</p>)}</Card></>}
 </>}
 </section>;
}
