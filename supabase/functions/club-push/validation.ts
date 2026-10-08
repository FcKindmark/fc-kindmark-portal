// Only documented browser push providers may receive requests.
export function validSubscription(value: unknown): boolean {
 const s=value as {endpoint?:string,keys?:{p256dh?:string,auth?:string}};
 try {
  const endpoint=new URL(s.endpoint!);
  if(endpoint.protocol!=="https:"||endpoint.username||endpoint.password||endpoint.port||endpoint.hash||s.endpoint!.length>2048)return false;
  if(!["fcm.googleapis.com","updates.push.services.mozilla.com","web.push.apple.com"].includes(endpoint.hostname))return false;
  const key=s.keys?.p256dh||"",auth=s.keys?.auth||"";
  if(!/^[A-Za-z0-9_-]{87}={0,1}$/.test(key)||!/^[A-Za-z0-9_-]{22}={0,2}$/.test(auth))return false;
  const decoded=atob(key.replace(/-/g,"+").replace(/_/g,"/"));
  return decoded.length===65&&decoded.charCodeAt(0)===4&&atob(auth.replace(/-/g,"+").replace(/_/g,"/")).length===16;
 }catch{return false;}
}
