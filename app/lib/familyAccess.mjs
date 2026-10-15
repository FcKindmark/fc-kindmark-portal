export function hasFamilyAccess(links,players,email){
 const address=String(email||'').trim().toLowerCase();
 return Boolean(links?.length)||Boolean(address&&(players||[]).some(p=>[p.mother_email,p.father_email].some(value=>String(value||'').trim().toLowerCase()===address)));
}
