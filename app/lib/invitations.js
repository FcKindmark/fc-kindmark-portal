import {supabase} from "./supabaseClient";
export async function inviteAccount(values) {
  const {data,error}=await supabase.functions.invoke("club-invite",{body:values});
  if(error) {
    let message="Välkomstmejlet kunde inte skickas. Försök igen via Lägg till förälder eller spelarkonto.";
    try {const response=await error.context?.json();if(response?.error)message=response.error;} catch {}
    throw new Error(message);
  }
  if(data?.error)throw new Error(data.error);
  return data;
}
