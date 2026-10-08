"use client";
import {useEffect,useState,useCallback} from 'react';
export function resolvePortalView(search, stored, scope, allowed, fallback) {
  const requested=new URLSearchParams(search).get(scope);
  return allowed.includes(requested) ? requested : allowed.includes(stored) ? stored : fallback;
}
// Only navigation is remembered. Forms, financial records and credentials are not stored here.
export default function usePortalView(scope, allowed, fallback, userId='') {
  const [view,setView]=useState(fallback);
  const allowedKey=allowed.join('|');
  const key=`kindmark:view:${userId}:${scope}`;
  useEffect(()=>{
    let stored=null;try{stored=sessionStorage.getItem(key);}catch{}
    setView(resolvePortalView(window.location.search,stored,scope,allowedKey.split('|'),fallback));
  },[scope,key,allowedKey,fallback]);
  const select=useCallback(value=>{
    if(!allowedKey.split('|').includes(value)) return;
    setView(value);
    try{sessionStorage.setItem(key,value);}catch{}
    const url=new URL(window.location.href);
    url.searchParams.set(scope,value);
    window.history.replaceState(window.history.state,'',url);
  },[scope,key,allowedKey]);
  return [view,select];
}
