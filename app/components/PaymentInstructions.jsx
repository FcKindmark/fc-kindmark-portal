"use client";
import {useState} from 'react';
import {Button} from './UI';
import {swishPaymentLink} from '../lib/payments';
export default function PaymentInstructions({payment}){
  const [notice,setNotice]=useState('');
  async function copy(){try{await navigator.clipboard.writeText(payment.reference || '');setNotice('Referensen kopierad');}catch{setNotice('Markera och kopiera referensen ovan.');}}
  const link=swishPaymentLink(payment);
  if(payment.status==='paid')return null;
  return <div className="payment-bank-details"><p><strong>Meddelande / betalningsreferens: {payment.reference || payment.player_name}</strong></p><div className="button-group">{payment.swish && link && <a className="club-button primary" href={link}>Öppna Swish med betalningsuppgifter</a>}{payment.reference && <Button variant="secondary" onClick={copy}>Kopiera referens</Button>}</div>{payment.bankgiro && <p className="muted">Bankgiro: kopiera referensen till bankens meddelandefält. Använd den inte som OCR-nummer.</p>}<p className="muted">Kontrollera mottagare, belopp och meddelande i Swish innan du godkänner. Klubben bekräftar betalningen efter kontroll av mottagen uppgift.</p>{notice && <p role="status">{notice}</p>}</div>;
}
