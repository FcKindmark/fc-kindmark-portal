// A self-contained A4 PDF with standard WinAnsi fonts; totals come from the
// immutable issued invoice, never from an editable browser calculation.
const esc=s=>String(s ?? '').replace(/[\\()]/g,c=>'\\'+c).replace(/[\r\n]/g,' ');
const number=n=>Number(n).toLocaleString('sv-SE',{minimumFractionDigits:2,maximumFractionDigits:2}).replace(/\u00a0/g,' ');
const wrap=(s,size)=>String(s||'').split(/\r?\n/).flatMap(line=>{const result=[];let text='';for(const word of line.split(/\s+/)){if((text+' '+word).length>size && text){result.push(text);text='';}for(let i=0;i<word.length;i+=size){const part=word.slice(i,i+size);if(i){result.push(text);text='';}text+=(text?' ':'')+part;}}result.push(text);return result;});
export function invoicePdfBytes(record) {
 if(record.status!=='issued')throw Error('Endast utställd faktura kan hämtas som original.');
 const f=record.payload,s=f.seller;const pages=[];let commands=[],y=790;
 const text=(value,x,at,size=10,bold=false)=>commands.push(`BT /${bold?'F2':'F1'} ${size} Tf 1 0 0 1 ${x} ${at} Tm (${esc(value)}) Tj ET`);
 const header=()=>{commands.push('0.84 0.69 0.23 rg 40 810 515 6 re f 0 0 0 rg');text(s.name,40,780,16,true);text('FAKTURA',400,780,20,true);text(f.invoice_no,400,758,12,true);y=722;};
 const finish=()=>{text(`${f.invoice_no} · Sida ${pages.length+1}`,40,30,8);pages.push(commands.join('\n'));commands=[];};
 const ensure=h=>{if(y-h<70){finish();header();}};
 const block=(value,x,width,bold=false)=>{for(const line of wrap(value,width)){ensure(16);text(line,x,y,10,bold);y-=15;}};
 header();block(s.address,40,80);block(`Org.nr ${s.org_no}${s.vat_no?' · Momsreg.nr '+s.vat_no:''}`,40,80);y-=15;
 block('Faktureras till',40,80,true);block(f.customer,40,80,true);block(f.customer_address,40,80);if(f.customer_org)block('Org.nr '+f.customer_org,40,80);if(f.customer_email)block(f.customer_email,40,80);
 y-=15;block(`Fakturadatum ${f.invoice_date} · Förfallodatum ${f.due_date}`,40,80);if(f.service_date)block('Leverans-/tjänstedatum '+f.service_date,40,80);if(f.customer_reference)block('Er referens: '+f.customer_reference,40,80);
 y-=16;ensure(40);text('Beskrivning',40,y,10,true);text('Antal',345,y,10,true);text('À-pris exkl. moms',390,y,9,true);text('Belopp',510,y,9,true);y-=22;
 for(const item of f.items){const rows=wrap(item.description,48);ensure(rows.length*15+18);rows.forEach((line,i)=>text(line,40,y-i*15));text(number(item.quantity),345,y,9);text(number(item.unit_price),405,y,9);text(number(invoiceTotals([item],'exempt').net),505,y,9);y-=rows.length*15+18;}
 ensure(150);y-=10;block('Summa exkl. moms: '+number(f.net_total)+' SEK',320,38);block('Moms'+(f.tax_mode==='vat25'?' 25 %':'')+': '+number(f.vat_total)+' SEK',320,38);block('Att betala: '+number(record.total)+' SEK',320,38,true);y-=20;
 if(f.tax_mode==='exempt')block(f.tax_note,40,80);
 ensure(135);y-=15;block('Betalningsuppgifter',40,80,true);block('Mottagare: '+s.name,40,80);block(`Bankgiro: ${s.bankgiro || '-'} · Swish: ${s.swish || '-'}`,40,80);block('Ange fakturanummer '+f.invoice_no+' som betalningsmeddelande.',40,80);block('Betalningsvillkor: '+(f.terms||'Betalas senast på förfallodagen.'),40,80);if(f.note)block(f.note,40,80);block(s.email||'',40,80);finish();
 // Latin-1 maps Swedish letters directly under /WinAnsiEncoding.
 const latin=s=>Uint8Array.from([...s].map(c=>{const n=c.codePointAt(0);return n<=255?n:c==='€'?128:45;}));
 const objects=[];const add=s=>{objects.push(s);return objects.length;};
 add('<< /Type /Catalog /Pages 2 0 R >>');add('');add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>');add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>');
 const kids=[];for(const page of pages){const stream=latin(page);const sid=add(`<< /Length ${stream.length} >>\nstream\n${page}\nendstream`);kids.push(add(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${sid} 0 R >>`));}
 objects[1]=`<< /Type /Pages /Count ${kids.length} /Kids [${kids.map(id=>id+' 0 R').join(' ')}] >>`;
 let file='%PDF-1.4\n',offsets=[0];objects.forEach((o,i)=>{offsets.push(latin(file).length);file+=`${i+1} 0 obj\n${o}\nendobj\n`;});const xref=latin(file).length;file+=`xref\n0 ${objects.length+1}\n0000000000 65535 f \n`+offsets.slice(1).map(n=>String(n).padStart(10,'0')+' 00000 n \n').join('')+`trailer\n<< /Size ${objects.length+1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
 return latin(file);
}
export function invoiceTotals(items,taxMode){
 const scaled=(value,places)=>{const s=String(value ?? '').replace(',','.');if(!/^\d*(?:\.\d*)?$/.test(s))return 0n;const [whole='',fraction='']=s.split('.');return BigInt(whole||'0')*10n**BigInt(places)+BigInt((fraction+'0'.repeat(places)).slice(0,places)||'0');};
 const nets=items.map(i=>(scaled(i.quantity,3)*scaled(i.unit_price,2)+500n)/1000n);
 const net=nets.reduce((a,b)=>a+b,0n),vat=taxMode==='vat25'?nets.reduce((a,b)=>a+(b+2n)/4n,0n):0n;
 return {net:Number(net)/100,vat:Number(vat)/100,total:Number(net+vat)/100};
}
