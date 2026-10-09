export function privateUpdate(update: any) {
  if (!Number.isSafeInteger(update?.update_id) || update.update_id < 0) return null;
  const callback = update.callback_query;
  const message = callback?.message || update.message;
  const sender = callback?.from || message?.from;
  if (message?.chat?.type !== 'private' || !Number.isSafeInteger(sender?.id) || sender.id <= 0 || sender.id !== message.chat.id || sender.is_bot) return null;
  if (callback) {
    if (/^test:[yn]$/.test(callback.data || '') && typeof callback.id === 'string') return {updateId:update.update_id,chat:sender.id,command:'test',token:null,action:null,answer:callback.data==='test:y',callbackId:callback.id};
    const match = /^r:([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}):([yn])$/.exec(callback.data || '');
    if (!match || typeof callback.id !== 'string') return null;
    return {updateId:update.update_id,chat:sender.id,command:'reply',token:null,action:match[1],answer:match[2]==='y',callbackId:callback.id};
  }
  const text = typeof message.text === 'string' ? message.text.trim() : '';
  const start = /^\/start(?:@[A-Za-z0-9_]+)? ([a-f0-9]{64})$/.exec(text);
  return {updateId:update.update_id,chat:sender.id,command:start?'start':/^\/stop(?:@[A-Za-z0-9_]+)?$/.test(text)?'stop':'help',token:start?.[1]||null,action:null,answer:null,callbackId:null};
}
export async function hashToken(token: string) {
  const digest = await crypto.subtle.digest('SHA-256',new TextEncoder().encode(token));
  return Array.from(new Uint8Array(digest),v=>v.toString(16).padStart(2,'0')).join('');
}
export function randomSecret() {
  return Array.from(crypto.getRandomValues(new Uint8Array(32)),v=>v.toString(16).padStart(2,'0')).join('');
}
export async function telegramRequest(token: string,method: string,payload: unknown,fetcher = fetch) {
  try {
    const response = await fetcher(`https://api.telegram.org/bot${token}/${method}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload),signal:AbortSignal.timeout(8000)});
    const body = await response.json();
    // Never propagate provider URLs or descriptions: they can contain bot credentials.
    return {ok:response.ok&&body.ok===true,status:body.ok===true?200:(body.error_code||response.status),result:body.ok===true?body.result:null,retryAfter:Number(body.parameters?.retry_after)||120};
  } catch {return {ok:false,status:503,result:null,retryAfter:120};}
}
