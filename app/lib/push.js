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
export async function disableDevicePush() {
  if(!("serviceWorker" in navigator))return;
  const registration=await navigator.serviceWorker.getRegistration("/");
  const subscription=await registration?.pushManager?.getSubscription();
  if(!subscription)return;
  // Remove the account link before unsubscribing so switching accounts cannot leak notifications.
  await pushRequest({action:"unsubscribe",endpoint:subscription.endpoint});
  await subscription.unsubscribe();
  const notifications=await registration.getNotifications();notifications.forEach(notification=>notification.close());
}
