import { csvText } from './attendance';
export const money = value => new Intl.NumberFormat('sv-SE', {
  style: 'currency',
  currency: 'SEK'
}).format(Number(value || 0));
export const cents = value => Math.round(Number(value || 0) * 100);
export function parseAmount(value) {
  const s = String(value).trim().replace(/[\s\u00a0]/g, '').replace(/SEK|kr/gi, '');
  const normalized = s.includes(',') ? s.replaceAll('.', '').replace(',', '.') : s;
  if (!/^-?\d+(\.\d{1,2})?$/.test(normalized)) throw Error(`Ogiltigt belopp: ${value}`);
  const n = Number(normalized);
  if (!Number.isFinite(n) || Math.abs(n) > 999999999999) throw Error('Beloppet är för stort');
  return n;
}
export function parseCSV(text) {
  const clean = text.replace(/^\uFEFF/, '');
  const first = clean.split(/\r?\n/)[0];
  const sep = [';', '\t', ','].sort((a, b) => first.split(b).length - first.split(a).length)[0];
  const rows = [];
  let row = [],
    cell = '',
    quoted = false;
  for (let i = 0; i < clean.length; i++) {
    const c = clean[i];
    if (c === '"') {
      if (quoted && clean[i + 1] === '"') {
        cell += '"';
        i++;
      } else quoted = !quoted;
    } else if (c === sep && !quoted) {
      row.push(cell);
      cell = '';
    } else if ((c === '\n' || c === '\r') && !quoted) {
      if (c === '\r' && clean[i + 1] === '\n') i++;
      row.push(cell);
      if (row.some(v => v.trim())) rows.push(row);
      row = [];
      cell = '';
    } else cell += c;
  }
  if (quoted) throw Error('CSV-filen har ett oavslutat citattecken');
  row.push(cell);
  if (row.some(v => v.trim())) rows.push(row);
  if (rows.length < 2) throw Error('Filen behöver rubriker och minst en bankrad');
  return {
    headers: rows[0],
    rows: rows.slice(1)
  };
}
export function bankRows(csv, mapping) {
  if (mapping.date === '' || mapping.amount === '') throw Error('Välj datum- och beloppskolumn');
  return csv.rows.map((r, i) => {
    const date = String(r[mapping.date] || '').trim().slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || new Date(`${date}T12:00:00Z`).toISOString().slice(0, 10) !== date) throw Error(`Kontrollera datum på rad ${i + 2}`);
    const amount = parseAmount(r[mapping.amount]);
    if (!amount) throw Error(`Nollbelopp på rad ${i + 2}`);
    return {
      date,
      amount,
      description: mapping.description === '' ? '' : r[mapping.description] || '',
      reference: mapping.reference === '' ? '' : r[mapping.reference] || ''
    };
  });
}
export async function fingerprints(rows) {
  const seen = new Map();
  return Promise.all(rows.map(async r => {
    const key = JSON.stringify([r.date, cents(r.amount), r.description.trim(), r.reference.trim()]);
    const occurrence = (seen.get(key) || 0) + 1;
    seen.set(key, occurrence);
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`${key}|${occurrence}`));
    return {
      ...r,
      fingerprint: Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, '0')).join('')
    };
  }));
}
export function suggestAccount(bank, partners = [], payments = []) {
  const text = `${bank.description} ${bank.reference}`.toLowerCase();
  const partner = partners.find(p => p.name.length > 2 && text.includes(p.name.toLowerCase()));
  const matches = bank.amount > 0 ? payments.filter(p => p.reference && text.includes(String(p.reference).toLowerCase()) && cents(p.amount) === cents(bank.amount)) : [];
  if (matches.length === 1) return {
    account: matches[0].payment_kind === 'membership' ? '3901' : '3990',
    reason: `Referens matchar ${matches[0].player_name || 'medlem'}; kontrollera betalningen`,
    payment: matches[0]
  };
  if (partner && bank.amount > 0) return {
    account: partner.kind === 'grant' ? '3980' : '3910',
    partner_id: partner.id,
    reason: `Namnet matchar ${partner.name}`
  };
  if (bank.amount > 0) {
    if (/medlem/.test(text)) return {
      account: '3901',
      reason: 'Texten nämner medlemsavgift'
    };
    if (/träning|traning/.test(text)) return {
      account: '3902',
      reason: 'Texten nämner träningsavgift'
    };
    if (/bidrag|lok.stöd|kommun/.test(text)) return {
      account: '3980',
      reason: 'Texten kan avse bidrag'
    };
    return {
      account: '3990',
      reason: 'Välj rätt intäktskonto'
    };
  }
  if (/legea|kläder|utrustning/.test(text)) return {
    account: '4010',
    reason: 'Texten kan avse utrustning'
  };
  if (/hall|hyra/.test(text)) return {
    account: '5010',
    reason: 'Texten kan avse hyra'
  };
  if (/bank|avgift/.test(text)) return {
    account: '6570',
    reason: 'Texten kan avse bankkostnad'
  };
  return {
    account: '6990',
    reason: 'Välj rätt kostnadskonto'
  };
}
export function entryForBank(bank, suggestion) {
  const n = Math.abs(bank.amount);
  return {
    date: bank.date,
    description: bank.description || bank.reference || 'Banktransaktion',
    type: 'normal',
    bank_id: bank.id,
    document_id: bank.statement_document || '',
    partner_id: suggestion.partner_id || '',
    lines: bank.amount > 0 ? [{
      account: '1930',
      debit: n,
      credit: 0
    }, {
      account: suggestion.account,
      debit: 0,
      credit: n
    }] : [{
      account: suggestion.account,
      debit: n,
      credit: 0
    }, {
      account: '1930',
      debit: 0,
      credit: n
    }]
  };
}
export function report(accounts, journal, lines, year) {
  const end = `${year}-12-31`,
    start = `${year}-01-01`;
  const posted = new Map(journal.filter(j => j.status === 'posted' && j.date <= end).map(j => [j.id, j]));
  const by = new Map(accounts.map(a => [a.code, {
    ...a,
    opening: 0,
    change: 0,
    closing: 0
  }]));
  for (const l of lines) {
    const j = posted.get(l.journal_id),
      a = by.get(l.account);
    if (!j || !a) continue;
    const net = cents(l.debit) - cents(l.credit);
    if (j.date < start) a.opening += net;else a.change += net;
    a.closing += net;
  }
  const all = [...by.values()];
  const sum = (kind, field, sign = 1) => all.filter(a => a.kind === kind).reduce((s, a) => s + a[field] * sign, 0);
  const income = sum('income', 'change', -1),
    expense = sum('expense', 'change'),
    result = income - expense;
  const assets = sum('asset', 'closing'),
    liabilities = sum('liability', 'closing', -1),
    equity = sum('equity', 'closing', -1),
    priorResult = sum('income', 'opening', -1) - sum('expense', 'opening');
  return {
    accounts: all,
    income,
    expense,
    result,
    assets,
    liabilities,
    equity,
    priorResult,
    difference: assets - liabilities - equity - priorResult - result,
    bank: by.get('1930')?.closing || 0
  };
}
export function matchedBank(bank, journal, lines) {
  const ids = new Set(journal.filter(j => j.bank_id === bank.id && j.status === 'posted').map(j => j.id));
  return lines.filter(l => ids.has(l.journal_id) && l.account === '1930').reduce((s, l) => s + cents(l.debit) - cents(l.credit), 0) === cents(bank.amount);
}
export function journalRows(journal, lines, accounts) {
  const names = new Map(accounts.map(a => [a.code, a.name]));
  return [['Verifikation', 'Datum', 'Beskrivning', 'Konto', 'Kontonamn', 'Debet', 'Kredit', 'Bankrad', 'Underlag', 'Rättar verifikation'], ...journal.filter(j => j.status === 'posted').sort((a, b) => a.date.localeCompare(b.date) || a.number - b.number).flatMap(j => lines.filter(l => l.journal_id === j.id).map(l => [`${j.year}-${j.number}`, j.date, j.description, l.account, names.get(l.account), l.debit, l.credit, j.bank_id || '', j.document_id || '', j.reversal_of || '']))];
}
export function downloadCSV(name, rows) {
  const url = URL.createObjectURL(new Blob([csvText(rows)], {
    type: 'text/csv;charset=utf-8'
  }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function downloadArchive(data) {
  const url = URL.createObjectURL(new Blob([JSON.stringify({
    format: 'FC Kindmark economy v1',
    exported_at: new Date().toISOString(),
    ...data
  }, null, 2)], {
    type: 'application/json'
  }));
  const a = document.createElement('a');
  a.href = url;
  a.download = `kindmark-ekonomi-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
