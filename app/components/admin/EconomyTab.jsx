"use client";

import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { Card, Button, Input, Select } from '../UI';
import { money, cents, parseCSV, bankRows, fingerprints, suggestAccount, entryForBank, report, matchedBank, journalRows, downloadCSV, downloadArchive } from '../../lib/economy';
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
  payments = [],
  onPaymentsChanged,
  initialData = null,
  initialView = "overview"
}) {
  const [view, setView] = useState(initialView),
    [year, setYear] = useState(Number(today().slice(0, 4))),
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
    [reviewed, setReviewed] = useState(false);
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
      upsert: false
    });
    if (error) throw error;
    return path;
  }
  async function saveDocument(e) {
    e.preventDefault();
    await run(async () => {
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
  function fromDocument(d) {
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
      const {
        error: e
      } = await supabase.rpc('club_econ_entry', {
        action,
        payload
      });
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
      payment_ids: [],
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
      setNotice(`${rows.length} bankrader behandlade. Öppna ett förslag och kontrollera konteringen.`);
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
    return data.lines.filter(l => ids.has(l.journal_id) && l.account === '1930').reduce((s, l) => s + cents(l.debit) - cents(l.credit), 0) / 100;
  };
  return <section className="economy"><div className="page-heading"><div><h1>Ekonomi</h1><p>FC Kindmark · underlag, bank och bokföring</p></div><label>Kalenderår<Select value={year} onChange={e => {
          setYear(Number(e.target.value));
          setReviewed(false);
        }}>{Array.from(new Set([year, ...data.years.map(y => y.year), ...data.bank.map(b => Number(b.date.slice(0, 4))), 2026, 2027, 2028])).sort().map(y => <option key={y}>{y}</option>)}</Select></label></div>
 <div className="economy-tabs" role="group" aria-label="Ekonomisidor">{[['overview', 'Översikt'], ['documents', 'Fakturor & kvitton'], ['bank', 'Bank & avstämning'], ['partners', 'Sponsorer & stöd'], ['journal', 'Bokföring'], ['reports', 'Rapporter & bokslut']].map(([id, label]) => <Button key={id} variant={view === id ? 'primary' : 'secondary'} aria-pressed={view === id} onClick={() => {
        setView(id);
        setEntry(null);
      }}>{label}</Button>)}</div>
 {error && <p className="error-banner" role="alert">{error}</p>}{notice && <p className="economy-notice" role="status">{notice}</p>}{locked && <p className="economy-notice">{year} är låst.</p>}
 {loading ? <p role="status">Läser ekonomin…</p> : <>
 {view === 'overview' && <><div className="economy-stats">{[['Intäkter', summary.income], ['Kostnader', summary.expense], ['Resultat', summary.result], ['Bokfört banksaldo', summary.bank]].map(([label, n]) => <Card key={label}><span>{label}</span><strong>{money(n / 100)}</strong></Card>)}</div><Card><h2>Att göra</h2><p>{unmatched.length} bankrader att stämma av · {yearJournal.filter(j => j.status === 'draft').length} utkast · {yearDocuments.length} underlag</p><div className="economy-actions"><Button onClick={() => setView('documents')}>Lägg till faktura eller kvitto</Button><Button variant="secondary" onClick={() => setView('bank')}>Importera bankutdrag</Button></div><p>Beloppen räknas endast från bokförda verifikationer. Medlemsavgifter i Betalningar är betalningskrav och räknas inte som en extra intäkt här.</p></Card></>}
 {view === 'documents' && <><div className="page-heading"><h2>Fakturor och kvitton</h2><Button onClick={() => {
            setDocument({
              kind: 'purchase',
              party: '',
              document_date: today(),
              due_date: '',
              amount: '',
              reference: '',
              partner_id: ''
            });
            setFile(null);
          }}>+ Lägg till underlag</Button></div><p>PDF, foto, CSV eller Excel. Fakturauppgifter registreras här; automatisk tolkning av skannade fakturor är ännu inte ansluten.</p>{document && <Card><form onSubmit={saveDocument} className="economy-form"><h3>{document.id ? 'Ändra underlag' : 'Nytt underlag'}</h3>{!document.id && <label>Fil<Input required type="file" accept=".pdf,.jpg,.jpeg,.png,.csv,.xlsx,.xls" onChange={e => setFile(e.target.files[0])} /></label>}<label>Typ<Select value={document.kind} onChange={e => setDocument({
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
              })} /></label><label>Totalbelopp SEK<Input required type="number" min="0" step="0.01" value={document.amount} onChange={e => setDocument({
                ...document,
                amount: e.target.value
              })} /></label><label>Fakturanummer / referens<Input value={document.reference} onChange={e => setDocument({
                ...document,
                reference: e.target.value
              })} /></label><label>Sponsor / bidragsgivare<Select value={document.partner_id || ''} onChange={e => setDocument({
                ...document,
                partner_id: e.target.value
              })}><option value="">Ingen koppling</option>{data.partners.map(p => <option key={p.id} value={p.id}>{p.name} · {p.year}</option>)}</Select></label><div className="economy-actions"><Button type="submit" disabled={busy}>Spara underlag</Button><Button variant="secondary" onClick={() => setDocument(null)}>Avbryt</Button></div></form></Card>}{yearDocuments.map(d => {
          const booked = data.journal.some(j => j.document_id === d.id && j.status === 'posted');
          return <Card key={d.id}><div className="page-heading"><div><h3>{d.party || d.name}</h3><p>{kinds[d.kind]} · {d.document_date} · {d.reference}</p></div><strong>{money(d.amount)}</strong></div><p>{booked ? 'Kopplat till bokföring' : 'Ej bokfört'}{d.due_date ? ` · Förfallodatum ${d.due_date}` : ''}</p><div className="economy-actions"><Button variant="secondary" disabled={busy} onClick={() => openDocument(d)}>Hämta fil</Button>{!locked && !booked && <><Button variant="secondary" onClick={() => {
                  setDocument(d);
                  setFile(null);
                }}>Ändra</Button>{d.kind !== 'statement' && <Button onClick={() => fromDocument(d)}>Konteringsförslag</Button>}<Button variant="danger" onClick={() => {
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
                }}>Ta bort</Button></>}</div></Card>;
        })}</>}
 {view === 'bank' && <><h2>Bankutdrag · konto 1930</h2><Card><label>Importera bankens CSV<Input type="file" accept=".csv" disabled={busy || locked} onChange={async e => {
              setError('');
              try {
                const f = e.target.files[0];
                if (!f) return;
                if (f.size > 5 * 1024 * 1024) throw Error('CSV-filen får vara högst 5 MB');
                const parsed = parseCSV(await f.text());
                setCSV(parsed);
                setImportFile(f);
                setPreview(null);
                const guess = re => {
                  const i = parsed.headers.findIndex(h => re.test(h));
                  return i < 0 ? '' : String(i);
                };
                setMapping({
                  date: guess(/datum|date/i),
                  amount: guess(/belopp|amount/i),
                  description: guess(/text|beskriv|description/i),
                  reference: guess(/referens|reference|ocr/i)
                });
              } catch (err) {
                setError(err.message);
              }
            }} /></label><p>Datumformat ÅÅÅÅ-MM-DD. Belopp ska vara positivt för inbetalningar och negativt för utbetalningar. PDF-utdrag kan sparas som underlag; CSV används för automatisk radimport.</p>{csv && <><div className="economy-form">{[['date', 'Datum'], ['amount', 'Belopp med tecken'], ['description', 'Beskrivning'], ['reference', 'Referens']].map(([key, label]) => <label key={key}>{label}<Select value={mapping[key]} onChange={e => {
                  setMapping({
                    ...mapping,
                    [key]: e.target.value
                  });
                  setPreview(null);
                }}><option value="">Välj kolumn</option>{csv.headers.map((h, i) => <option key={i} value={i}>{h}</option>)}</Select></label>)}</div><Button disabled={busy} onClick={prepareImport}>Förhandsgranska</Button></>}{preview && <><p>{preview.length} rader · {preview.filter(r => data.bank.some(b => b.fingerprint === r.fingerprint)).length} redan importerade. Överlappande utdrag matchas på datum, belopp, text och referens; kontrollera identiska transaktioner.</p><div className="economy-table"><table><thead><tr><th>Datum</th><th>Text</th><th>Belopp</th></tr></thead><tbody>{preview.slice(0, 20).map((r, i) => <tr key={i}><td>{r.date}</td><td>{r.description}</td><td>{money(r.amount)}</td></tr>)}</tbody></table></div><Button disabled={busy || locked} onClick={importBank}>Bekräfta import</Button></>}</Card><h3>{unmatched.length} transaktioner att bokföra</h3>{yearBank.map(b => {
          const done = matchedBank(b, data.journal, data.lines);
          const draft = data.journal.find(j => j.bank_id === b.id && j.status === 'draft');
          return <Card key={b.id}><div className="page-heading"><div><strong>{b.description || b.reference || 'Banktransaktion'}</strong><p>{b.date} · {b.reference} · {done ? 'Avstämd' : 'Ej avstämd'}</p></div><strong>{money(b.amount)}</strong></div>{!done && !locked && <Button disabled={busy} onClick={() => draft ? edit(draft) : startBank(b)}>{draft ? 'Öppna utkast' : 'Öppna konteringsförslag'}</Button>}</Card>;
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
              })} /></label><div className="economy-actions"><Button type="submit" disabled={busy}>Spara</Button><Button variant="secondary" onClick={() => setPartner(null)}>Avbryt</Button></div></form></Card>}<p>{yearPartners.filter(p => p.kind === 'sponsor').length} sponsorer · {yearPartners.filter(p => p.kind === 'grant').length} bidragsgivare. Mottaget räknas från bokförda bankrader som kopplats till parten.</p>{yearPartners.map(p => <Card key={p.id}><h3>{p.name}</h3><p>{p.kind === 'sponsor' ? 'Sponsor' : 'Bidrag / stöd'} · Avtalat {money(p.agreed_amount)} · Mottaget {money(partnerReceived(p))}</p><p>{p.note}</p><div className="economy-actions"><Button variant="secondary" onClick={() => setPartner(p)}>Ändra</Button><Button variant="danger" disabled={busy} onClick={() => {
              if (confirm('Ta bort? Kopplade underlag och verifikationer måste bevaras.')) run(async () => {
                const {
                  error: e
                } = await supabase.from('club_econ_partners').delete().eq('id', p.id).select('id').single();
                if (e) throw e;
              });
            }}>Ta bort</Button></div></Card>)}</>}
 {view === 'journal' && <><div className="page-heading"><h2>Verifikationer</h2><Button disabled={locked} onClick={() => setEntry(emptyEntry())}>+ Ny verifikation</Button></div><p>Bokförda poster bevaras. Rättelse skapar motsatta debet/kredit-rader och behåller originalet.</p>{yearJournal.map(j => <Card key={j.id}><strong>{j.status === 'posted' ? `${j.year}-${j.number}` : 'Utkast'} · {j.description}</strong><p>{j.date}{j.reversal_of ? ' · Motverifikation' : ''}</p><details><summary>Visa kontering</summary>{data.lines.filter(l => l.journal_id === j.id).map(l => <p key={l.id}>{l.account} · Debet {money(l.debit)} · Kredit {money(l.credit)}</p>)}</details>{!locked && <div className="economy-actions">{j.status === 'draft' ? <><Button onClick={() => edit(j)}>Öppna / ändra</Button><Button variant="danger" disabled={busy} onClick={() => removeDraft(j)}>Ta bort utkast</Button></> : !j.reversal_of && !data.journal.some(r => r.reversal_of === j.id) && <Button variant="secondary" disabled={busy} onClick={() => reverse(j)}>Rätta med motverifikation</Button>}</div>}</Card>)}</>}
 {entry && <Card className="economy-editor"><h2>Kontrollera kontering</h2><div className="economy-form"><label>Datum<Input type="date" value={entry.date} disabled={Boolean(entry.bank_id)} onChange={e => setEntry({
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
            })}><option value="">Ingen koppling</option>{data.partners.filter(p => p.year === Number(entry.date.slice(0, 4))).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</Select></label></div><p>Kontrollera om beloppet ska delas på medlem, träning, kläder eller moms. En betald faktura bokförs mot fordran/skuld, inte som en ny intäkt/kostnad.</p>{entry.lines.map((l, i) => <div className="economy-line" key={i}><label>Konto<Select value={l.account} onChange={e => setEntry({
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
        })}>+ Dela belopp / lägg till rad</Button>{entry.bank_id && data.bank.find(b => b.id === entry.bank_id)?.amount > 0 && <details><summary>Koppla och bekräfta medlemsbetalningar</summary><p>Välj hela betalningar som ingår i bankbeloppet. En delbetalning lämnas utan denna koppling tills hela avgiften är betald.</p>{payments.filter(p => !data.payment_links.some(l => l.payment_id === p.id && !data.journal.some(j => j.reversal_of === l.journal_id))).map(p => <label className="economy-check" key={p.id}><input type="checkbox" checked={(entry.payment_ids || []).includes(p.id)} onChange={e => setEntry({
              ...entry,
              payment_ids: e.target.checked ? [...(entry.payment_ids || []), p.id] : (entry.payment_ids || []).filter(id => id !== p.id)
            })} />{p.player_name} · {p.description} · {money(p.amount)} · {p.reference}</label>)}</details>}<p>Skillnad debet–kredit: <strong>{money(balance / 100)}</strong></p><div className="economy-actions"><Button variant="secondary" disabled={busy || balance !== 0} onClick={() => saveEntry('save')}>Spara utkast</Button><Button disabled={busy || balance !== 0} onClick={() => {
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
            })}>Exportera ekonomidata (JSON)</Button><Button onClick={() => window.print()}>Skriv ut / spara PDF</Button></div></div><p>Rapporterna bygger på bokförda poster. Bokslutsunderlag för granskning, komplettering och signering; ingen färdig skattedeklaration. JSON-exporten innehåller ekonomidata och filreferenser; originalfiler hämtas separat under Fakturor & kvitton.</p><Card><h3>Resultaträkning</h3>{summary.accounts.filter(a => ['income', 'expense'].includes(a.kind)).map(a => <div className="economy-report-row" key={a.code}><span>{a.code} · {a.name}</span><strong>{money((a.kind === 'income' ? -a.change : a.change) / 100)}</strong></div>)}<div className="economy-report-row"><strong>Årets resultat</strong><strong>{money(summary.result / 100)}</strong></div></Card><Card><h3>Balansräkning · 31 december</h3>{summary.accounts.filter(a => !['income', 'expense'].includes(a.kind)).map(a => <div className="economy-report-row" key={a.code}><span>{a.code} · {a.name}</span><strong>{money((a.kind === 'asset' ? a.closing : -a.closing) / 100)}</strong></div>)}<div className="economy-report-row"><span>Tidigare resultat, ej omfört</span><strong>{money(summary.priorResult / 100)}</strong></div><div className="economy-report-row"><span>Årets resultat</span><strong>{money(summary.result / 100)}</strong></div><div className="economy-report-row"><strong>Tillgångar</strong><strong>{money(summary.assets / 100)}</strong></div><div className="economy-report-row"><strong>Eget kapital och skulder, inklusive resultat</strong><strong>{money((summary.equity + summary.liabilities + summary.priorResult + summary.result) / 100)}</strong></div><p>Balansdifferens: {money(summary.difference / 100)}</p></Card><Card className="no-print"><h3>Årsbokslut · underlag och avstämning</h3><p>{unmatched.length} bankrader kvar · {yearJournal.filter(j => j.status === 'draft').length} utkast. Ange ingående balans, stäm av skulder/fordringar och komplettera med periodiseringar, inventarier och moms där det behövs.</p><label>Bankens saldo 31 december, SEK<Input type="number" step="0.01" value={bankBalance} onChange={e => setBankBalance(e.target.value)} disabled={locked} /></label><label className="economy-check"><input type="checkbox" checked={reviewed} disabled={locked} onChange={e => setReviewed(e.target.checked)} /> Jag har granskat underlag, ingående balans, fordringar, skulder och årsslutsjusteringar.</label><Button disabled={busy || locked || !reviewed || bankBalance === '' || unmatched.length > 0 || yearJournal.some(j => j.status === 'draft')} onClick={lockYear}>Lås kontrollerat år</Button><Button variant="secondary" onClick={() => downloadCSV(`kindmark-bokslutsunderlag-${year}.csv`, [['Rapport', 'Konto', 'Namn', 'Ingående balans', 'Årets förändring', 'Utgående balans'], ...summary.accounts.map(a => [a.kind, a.code, a.name, a.opening / 100, a.change / 100, a.closing / 100]), ['Resultat', '', 'Årets resultat', '', summary.result / 100, '']])}>Exportera bokslutsunderlag</Button></Card><Card className="no-print"><h3>Ändringshistorik</h3>{data.audit.slice(0, 20).map(a => <p key={a.id}>{new Date(a.at).toLocaleString('sv-SE')} · {a.action} · {a.entity} · användare {a.actor}</p>)}</Card></>}
 </>}
 </section>;
}
