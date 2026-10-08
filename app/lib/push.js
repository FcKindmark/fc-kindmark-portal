import {supabase} from "./supabaseClient";
export function pushAvailability() {
  const ios=/iPad|iPhone|iPod/.test(navigator.userAgent)||(navigator.platform==="MacIntel"&&navigator.maxTouchPoints>1);
  const standalone=window.matchMedia("(display-mode: standalone)").matches||Boolean(navigator.standalone);
  if(ios&&!standalone)return "install";
  if(!window.isSecureContext||!("serviceWorker" in navigator)||!("PushManager" in window)||!("Notification" in window))return "unsupported";
  return "supported";
}
export function applicationKey(value) {
  const binary=atob(value.replace(/-/g,"+").replace(/_/g,"/"));
  return Uint8Array.from(binary,c=>c.charCodeAt(0));
}
export async function pushRequest(body) {
  const {data,error}=await supabase.functions.invoke("club-push",{body});
  if(error){let response;try{response=await error.context?.json?.();}catch{}throw new Error(response?.error||"Notifikationerna kunde inte uppdateras. Försök igen.");}
  if(data?.error)throw new Error(data.error);
  return data;
}
const preferenceKey=userId=>`kindmark-push-enabled:${userId}`;
export function rememberDevicePush(userId,enabled) {
  try { window.localStorage.setItem(preferenceKey(userId),enabled?"1":"0"); } catch {}
}
export function shouldRestoreDevicePush(userId,permission) {
  try { return permission==="granted"&&window.localStorage.getItem(preferenceKey(userId))==="1"; } catch { return false; }
}
let subscriptionJob=null;
export function subscribeDevicePush(publicKey) {
  if(subscriptionJob)return subscriptionJob;
  subscriptionJob=(async()=>{
    await navigator.serviceWorker.register("/sw.js",{scope:"/",updateViaCache:"none"});
    const registration=await navigator.serviceWorker.ready;
    let subscription=await registration.pushManager.getSubscription();
    if(!subscription)subscription=await registration.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:applicationKey(publicKey)});
    await pushRequest({action:"subscribe",subscription:subscription.toJSON()});
    return subscription;
  })().finally(()=>{subscriptionJob=null;});
  return subscriptionJob;
}
export async function disableDevicePush() {
  // Logout disconnects this account, but preserves its opt-in for the next login.
  // Explicitly switching push off clears that preference in PushSettings.
  if(subscriptionJob)try { await subscriptionJob; } catch {}

  if(!("serviceWorker" in navigator))return;
  const registration=await navigator.serviceWorker.getRegistration("/");
  const subscription=await registration?.pushManager?.getSubscription();
  if(!subscription)return;
  // Remove the account link before unsubscribing so switching accounts cannot leak notifications.
  try { await pushRequest({action:"unsubscribe",endpoint:subscription.endpoint}); } catch { /* Local unsubscribe still revokes delivery; expired endpoints are pruned by the worker. */ }
  await subscription.unsubscribe();
  const notifications=await registration.getNotifications();notifications.forEach(notification=>notification.close());
}
