"use client";
import {useState} from 'react';
import {Card,Input} from './UI';
import {CLUB_SWISH,swishPaymentLink} from '../lib/payments';
export default function ClubGift(){
 const [amount,setAmount]=useState('100');
 const valid=Number.isFinite(Number(amount)) && Number(amount)>=1;
 return <Card><h3>Ge en gåva till FC Kindmark</h3><p>Stöd föreningen med en valfri gåva.</p><label>Belopp SEK<Input type="number" min="1" step="0.01" value={amount} onChange={e=>setAmount(e.target.value)}/></label>{valid && <a className="club-button primary" href={swishPaymentLink({swish:CLUB_SWISH,amount:Number(amount),reference:'Gåva FC Kindmark'})}>Ge en gåva med Swish</a>}<p>Swish: {CLUB_SWISH} · Meddelande: Gåva FC Kindmark</p><p className="muted">Kontrollera mottagare och belopp i Swish. Gåvan registreras när klubben har kontrollerat bankens inbetalning.</p></Card>;
}
