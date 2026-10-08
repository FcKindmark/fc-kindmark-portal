// Labelled values are editable suggestions; foreign amounts never become SEK.
export function invoiceFields(text) {
  const fields = {};
  const date = label => {
    const m = text.match(new RegExp(`(?:^|\\n)\\s*(?:${label})\\b[^\\n\\d]{0,30}(\\d{4}-\\d{2}-\\d{2}|\\d{2}/\\d{2}/\\d{4})`, 'i'));
    if (!m) return;
    const value = m[1].includes('/') ? m[1].split('/').reverse().join('-') : m[1];
    if (!Number.isNaN(Date.parse(value)) && new Date(value).toISOString().slice(0,10) === value) return value;
  };
  fields.document_date = date('fakturadatum|invoice date|datum|data documento');
  fields.due_date = date('förfallodatum|forfallodatum|due date');
  const proforma = /fattura proforma|proforma invoice|profaktura/i.test(text);
  if (proforma) {
    fields.proforma = true;
    const row = text.match(/fattura proforma\s+([A-Z0-9/-]+)\s+(\d{2}\/\d{2}\/\d{4})/i);
    if (row) {
      fields.reference = row[1];
      fields.document_date = dateFromEuropean(row[2]);
    }
  }
  const amount = text.match(/(?:att betala|totalt att betala|amount due|totalbelopp|totale fattura)\s*:?\s*(SEK|EUR|USD|GBP)?\s*([0-9][0-9 .\u00a0]*(?:[,.][0-9]{2})?)(?:\s*(kr|SEK|EUR|USD|GBP))?/i);
  if (amount) {
    const raw = amount[2].trim().replace(/[\s\u00a0]/g, '');
    const value = Number(raw.includes(',') ? raw.replaceAll('.', '').replace(',', '.') : raw);
    const currency = (amount[1] || amount[3] || 'SEK').toUpperCase().replace('KR','SEK');
    if (Number.isFinite(value) && value > 0) {
      if (currency === 'SEK') fields.amount = value;
      else { fields.original_amount = value; fields.currency = currency; }
    }
  }
  const ref = text.match(/(?:fakturanummer|faktura\s*nr\.?|invoice\s*(?:number|no\.?))\s*:?\s*\[?([A-Z0-9][A-Z0-9/-]{1,39})/i);
  if (ref) fields.reference = ref[1];
  const customer = text.match(/faktureras till\s*\n\s*([^\n]{2,120})/i);
  const party = text.match(/(?:leverantör|leverantor|supplier)\s*:\s*([^\n]{2,120})/i);
  const supplier = proforma && text.match(/(?:^|\n)\s*([^\n]{2,100}\bS\.P\.A\.)\s*(?:\n|$)/i);
  if (customer) { fields.party = customer[1].trim(); fields.kind = /sponsring/i.test(text) ? 'sponsor' : 'sales'; }
  else if (party || supplier) fields.party = (party || supplier)[1].trim();
  return Object.fromEntries(Object.entries(fields).filter(([, v]) => v !== undefined));
}
function dateFromEuropean(value) {
  const iso = value.split('/').reverse().join('-');
  return !Number.isNaN(Date.parse(iso)) && new Date(iso).toISOString().slice(0,10) === iso ? iso : undefined;
}
// Preserve visual rows rather than concatenating columns in PDF object order.
export function pdfTextRows(items) {
  const rows = [];
  for (const item of items.filter(i => typeof i.str === 'string' && i.str.trim()).sort((a,b)=>b.transform[5]-a.transform[5] || a.transform[4]-b.transform[4])) {
    let row = rows.find(r => Math.abs(r.y-item.transform[5]) < 2);
    if (!row) { row = {y:item.transform[5],items:[]}; rows.push(row); }
    row.items.push(item);
  }
  return rows.sort((a,b)=>b.y-a.y).map(row=>row.items.sort((a,b)=>a.transform[4]-b.transform[4]).map(i=>i.str).join(' ')).join('\n');
}
let enginePromise;
function engine() {
  if (!enginePromise) enginePromise = new Promise((resolve, reject) => {
    if (window.Tesseract) return resolve(window.Tesseract);
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/tesseract.js@6.0.1/dist/tesseract.min.js';
    script.onload = () => resolve(window.Tesseract);
    script.onerror = () => { enginePromise = null; script.remove(); reject(Error('Textläsaren kunde inte laddas. Ange uppgifterna manuellt eller försök igen.')); };
    document.head.appendChild(script);
  });
  return enginePromise;
}
export async function readInvoice(file, progress = () => {}) {
  if (file.size > 15 * 1024 * 1024) throw Error('Filen får vara högst 15 MB');
  let worker, pdf;
  async function recognize(image) {
    if (!worker) {
      const tess = await engine();
      worker = await tess.createWorker('swe+eng', 1, {
        workerPath: 'https://cdn.jsdelivr.net/npm/tesseract.js@6.0.1/dist/worker.min.js',
        corePath: 'https://cdn.jsdelivr.net/npm/tesseract.js-core@6.0.0',
        logger: m => progress(m.progress ? `Läser text · ${Math.round(m.progress * 100)} %` : 'Förbereder textläsning…')
      });
    }
    return (await worker.recognize(image)).data.text;
  }
  try {
    let text = '';
    if (/\.pdf$/i.test(file.name)) {
      const lib = await import(/* webpackIgnore: true */ 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/pdf.min.mjs');
      lib.GlobalWorkerOptions.workerSrc = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/pdf.worker.min.mjs';
      pdf = await lib.getDocument({data: new Uint8Array(await file.arrayBuffer()), isEvalSupported: false}).promise;
      if (pdf.numPages > 10) throw Error('Automatisk läsning stöder högst 10 sidor per faktura. Dela filen eller ange uppgifterna manuellt.');
      for (let n=1; n<=pdf.numPages; n++) {
        progress(`Läser sida ${n} av ${pdf.numPages}…`);
        const page = await pdf.getPage(n);
        const content = await page.getTextContent();
        let pageText = pdfTextRows(content.items);
        if (pageText.trim().length < 30) {
          const viewport = page.getViewport({scale: Math.min(2, 2400 / page.getViewport({scale:1}).width)});
          const canvas = document.createElement('canvas');
          canvas.width = viewport.width; canvas.height = viewport.height;
          await page.render({canvasContext: canvas.getContext('2d'), viewport}).promise;
          pageText = await recognize(canvas);
          canvas.width = canvas.height = 0;
        }
        text += pageText + '\n'; page.cleanup();
      }
    } else if (/\.(png|jpe?g)$/i.test(file.name)) text = await recognize(file);
    else return {text:'', fields:{}};
    return {text, fields: invoiceFields(text)};
  } finally {
    if (worker) await worker.terminate();
    if (pdf) await pdf.destroy();
  }
}
