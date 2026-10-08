// Conservative extraction: only labelled values become editable suggestions.
export function invoiceFields(text) {
  const fields = {};
  const date = label => {
    const m = text.match(new RegExp(`\\b(?:${label})\\b[^\\n\\d]{0,20}(\\d{4}-\\d{2}-\\d{2})`, 'i'));
    if (m && !Number.isNaN(Date.parse(m[1])) && new Date(m[1]).toISOString().slice(0,10) === m[1]) return m[1];
  };
  fields.document_date = date('fakturadatum|invoice date|datum');
  fields.due_date = date('förfallodatum|forfallodatum|due date');
  const amount = text.match(/(?:att betala|totalt att betala|amount due|totalbelopp)\s*:?\s*(?:SEK\s*)?([0-9][0-9 .\u00a0]*[,.][0-9]{2})(?:\s*(?:kr|SEK))?/i);
  if (amount) {
    const raw = amount[1].replace(/[\s\u00a0]/g, '');
    const value = Number(raw.includes(',') ? raw.replaceAll('.', '').replace(',', '.') : raw);
    if (Number.isFinite(value) && value > 0) fields.amount = value;
  }
  const ref = text.match(/(?:fakturanummer|faktura\s*nr\.?|invoice\s*(?:number|no\.?))\s*:?\s*([A-Z0-9][A-Z0-9/-]{1,39})/i);
  if (ref) fields.reference = ref[1];
  const party = text.match(/(?:leverantör|leverantor|supplier)\s*:\s*([^\n]{2,120})/i);
  if (party) fields.party = party[1].trim();
  return Object.fromEntries(Object.entries(fields).filter(([, v]) => v !== undefined));
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
        let pageText = content.items.map(item => item.str + (item.hasEOL ? '\n' : ' ')).join('');
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
