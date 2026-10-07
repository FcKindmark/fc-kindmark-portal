"use client";
import {useEffect,useState} from 'react';
import {supabase} from '../lib/supabaseClient';
import PaymentsView from './parent/PaymentsView';
export default function SupporterPayments({user}){
 const [payments,setPayments]=useState([]),[error,setError]=useState(''),[loading,setLoading]=useState(true);
 useEffect(()=>{let active=true;async function load(){try{const cards=await supabase.from('club_member_cards').select('id').eq('user_id',user.id);if(cards.error)throw cards.error;const ids=(cards.data||[]).map(c=>c.id);const r=ids.length?await supabase.from('payments').select('*').in('member_id',ids):{data:[]};if(r.error)throw r.error;if(active)setPayments(r.data||[]);}catch(err){if(active)setError(err.message);}finally{if(active)setLoading(false);}}load();return()=>{active=false;};},[user.id]);
 if(loading)return <p role="status">Läser medlemsbetalningar…</p>;
 if(error)return <p role="alert" className="error-banner">{error}</p>;
 return <PaymentsView data={{payments,players:[]}} memberPayments/>;
}
