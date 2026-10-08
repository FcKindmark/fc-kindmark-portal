const encode = value => new TextEncoder().encode(value);
const decode = value => new TextDecoder().decode(value);
const crcTable = Array.from({length:256}, (_, n) => {
  let c=n; for(let k=0;k<8;k++) c=(c&1)?0xedb88320^(c>>>1):c>>>1; return c>>>0;
});
const crc32 = bytes => {
  let c=0xffffffff; for(const b of bytes) c=crcTable[(c^b)&255]^(c>>>8); return (c^0xffffffff)>>>0;
};
export async function sha256(bytes) {
  return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)), b=>b.toString(16).padStart(2,'0')).join('');
}
function concat(parts) {
  const result=new Uint8Array(parts.reduce((n,p)=>n+p.length,0)); let at=0;
  for(const p of parts){result.set(p,at);at+=p.length;} return result;
}
// Portable ZIP with stored entries: ordinary archive tools can open it without this app.
export function zipStored(files) {
  const local=[], central=[]; let offset=0;
  for(const [name, bytes] of Object.entries(files)) {
    const filename=encode(name), crc=crc32(bytes), header=new Uint8Array(30+filename.length), h=new DataView(header.buffer);
    h.setUint32(0,0x04034b50,true);h.setUint16(4,20,true);h.setUint16(6,0x800,true);
    h.setUint16(12,33,true);h.setUint32(14,crc,true);h.setUint32(18,bytes.length,true);h.setUint32(22,bytes.length,true);h.setUint16(26,filename.length,true);header.set(filename,30);
    const record=new Uint8Array(46+filename.length), r=new DataView(record.buffer);
    r.setUint32(0,0x02014b50,true);r.setUint16(4,20,true);r.setUint16(6,20,true);r.setUint16(8,0x800,true);r.setUint16(14,33,true);r.setUint32(16,crc,true);r.setUint32(20,bytes.length,true);r.setUint32(24,bytes.length,true);r.setUint16(28,filename.length,true);r.setUint32(42,offset,true);record.set(filename,46);
    local.push(header,bytes);central.push(record);offset+=header.length+bytes.length;
  }
  if(central.length>65535) throw Error('För många filer i arkivet');
  const end=new Uint8Array(22), e=new DataView(end.buffer);
  e.setUint32(0,0x06054b50,true);e.setUint16(8,central.length,true);e.setUint16(10,central.length,true);e.setUint32(12,central.reduce((n,p)=>n+p.length,0),true);e.setUint32(16,offset,true);
  return concat([...local,...central,end]);
}
export function readStoredZip(bytes) {
  const files={}, view=new DataView(bytes.buffer, bytes.byteOffset,bytes.byteLength);let at=0;
  while(at+4<=bytes.length && view.getUint32(at,true)===0x04034b50) {
    if(at+30>bytes.length) throw Error('Ofullständigt arkiv');
    const method=view.getUint16(at+8,true), flags=view.getUint16(at+6,true), size=view.getUint32(at+18,true), nameLength=view.getUint16(at+26,true), extra=view.getUint16(at+28,true);
    if(method!==0 || (flags&9)) throw Error('Välj en oförändrad ZIP-kopia från portalen');
    const start=at+30+nameLength+extra, name=decode(bytes.slice(at+30,at+30+nameLength));
    if(start+size>bytes.length || !name || name.includes('..') || name.startsWith('/') || files[name]) throw Error('Skadat eller ogiltigt arkiv');
    const content=bytes.slice(start,start+size);
    if(crc32(content)!==view.getUint32(at+14,true)) throw Error(`Skadad fil: ${name}`);
    files[name]=content;at=start+size;
  }
  return files;
}
export async function makeBackup(snapshot, download, progress=()=>{}) {
  const files={'economy.json':encode(JSON.stringify({format:'FC Kindmark economy v2',exported_at:new Date().toISOString(),...snapshot},null,2))};
  let total=files['economy.json'].length;
  for(let i=0;i<snapshot.documents.length;i++) {
    const d=snapshot.documents[i];progress(`Hämtar underlag ${i+1}/${snapshot.documents.length}`);
    const bytes=new Uint8Array(await (await download(d.path)).arrayBuffer());
    total+=bytes.length;if(total>100*1024*1024) throw Error('Arkivet överstiger 100 MB. Kontakta administratören för en serverexport.');
    files[`originals/${d.path}`]=bytes;
  }
  const hashes={};for(const [name,bytes] of Object.entries(files)) hashes[name]=await sha256(bytes);
  files['manifest.json']=encode(JSON.stringify({format:'FC Kindmark backup v1',files:hashes},null,2));
  files['README.txt']=encode('FC Kindmark ekonomiar­kiv\nAlla år, verifikationer, ändringshistorik och originalunderlag.\nSHA-256-kontroller i manifest.json. Kontrollera kopian i Ekonomi / Rapporter.\nFörvara kopian säkert på en annan enhet. Detta är en manuell fullständig export, inte en schemalagd backup.\nÅterläsning till databasen kräver en kontrollerad återställning; importera aldrig som nya betalningar.\nRapporter och bokslutsunderlag måste granskas och kompletteras innan signering.\n');
  const bytes=zipStored(files);
  await verifyBackup(bytes); // Verify the exact bytes that will be downloaded.
  return bytes;
}
export async function verifyBackup(bytes) {
  if(bytes.length>100*1024*1024+1024*1024) throw Error('Arkivet är för stort');
  const files=readStoredZip(bytes);
  if(!files['manifest.json'] || !files['economy.json']) throw Error('Manifest eller ekonomidata saknas');
  const manifest=JSON.parse(decode(files['manifest.json']));
  if(manifest.format!=='FC Kindmark backup v1') throw Error('Okänt arkivformat');
  for(const [name,hash] of Object.entries(manifest.files)) {
    if(!files[name] || await sha256(files[name])!==hash) throw Error(`Kontrollsumman stämmer inte: ${name}`);
  }
  if(!manifest.files['economy.json']) throw Error('Ekonomidata saknar kontrollsumma');
  const data=JSON.parse(decode(files['economy.json']));
  if(data.format!=='FC Kindmark economy v2' || !Array.isArray(data.documents) || !Array.isArray(data.journal)) throw Error('Ogiltiga ekonomidata');
  for(const d of data.documents) if(!manifest.files[`originals/${d.path}`]) throw Error(`Original saknas: ${d.name}`);
  return {documents:data.documents.length,journal:data.journal.length,exported_at:data.exported_at};
}
export function downloadBackup(bytes) {
  const url=URL.createObjectURL(new Blob([bytes],{type:'application/zip'}));
  const a=document.createElement('a');a.href=url;a.download=`kindmark-ekonomi-${new Date().toISOString().slice(0,10)}.zip`;a.click();setTimeout(()=>URL.revokeObjectURL(url),10000);
}
