"use client";
export function Card({children,className="",style,...props}) {return <div className={`club-card ${className}`} style={style} {...props}>{children}</div>;}
export function Button({children,variant="primary",className="",style,type="button",...props}) {return <button type={type} className={`club-button ${variant} ${className}`} style={style} {...props}>{children}</button>;}
export function Input(props) {return <input className="club-input" {...props}/>;}
export function Select({children,...props}) {return <select className="club-input" {...props}>{children}</select>;}
export function Badge({children,variant="default"}) {return <span className={`club-badge ${variant}`}>{children}</span>;}
export function Header({title,subtitle}) {return <div className="page-heading"><div><h1>{title}</h1>{subtitle && <p>{subtitle}</p>}</div></div>;}
export function Empty({message="Ingen data"}) {return <div className="club-empty">{message}</div>;}
export function Modal({isOpen,onClose,title,children}) {if(!isOpen)return null;return <div className="club-modal" onClick={e=>{if(e.target===e.currentTarget)onClose();}}><Card role="dialog" aria-modal="true" aria-label={title}><h2>{title}</h2><button onClick={onClose} aria-label="Stäng">×</button>{children}</Card></div>;}
export function LogoIcon({size=40}) {return <img src="/logo.png" alt="FC Kindmark" width={size} height={size}/>;}
