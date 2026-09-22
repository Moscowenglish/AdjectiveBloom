"use client";

import { useEffect, useRef, useState } from "react";
import { RotateCcw, Sparkles, Volume2, VolumeX } from "lucide-react";

const BASE = "/adjectivebloom";
const asset = (p:string)=>`${BASE}${p}`;
const PAIRS = [
["confident","shy"],["reliable","unreliable"],["hard-working","lazy"],["enthusiastic","unenthusiastic"],
["brave","cowardly"],["sensible","careless"],["calm","angry"],["positive","negative"],
["generous","ungenerous"],["talented","talentless"],["sociable","unsociable"],["patient","impatient"],
["curious","uninterested"],["creative","uncreative"]] as const;
const photoFor=(w:string)=>asset(`/photos-webp/${w}.webp`);
const growthStageFor=(n:number)=>n<=1?0:n===2?1:n===3?2:n<=5?3:n<=7?4:n<=9?5:n<=12?6:7;

export default function Home(){
 const [screen,setScreen]=useState<"start"|"game"|"finish">("start");
 const [batch,setBatch]=useState(0); const [selected,setSelected]=useState<string|null>(null);
 const [matched,setMatched]=useState<string[]>([]); const [streak,setStreak]=useState(0);
 const [feedback,setFeedback]=useState("Pick up a Polaroid and find its opposite envelope");
 const [wrong,setWrong]=useState<string|null>(null); const [sound,setSound]=useState(true); const [volume,setVolume]=useState(.38);
 const musicRef=useRef<HTMLAudioElement|null>(null);
 const start=batch*4, active=PAIRS.slice(start,start+4), cards=active.map(x=>x[0]), envelopes=active.map(x=>x[1]).reverse();
 const stage=growthStageFor(matched.length);

 useEffect(()=>{[...cards.map(photoFor),asset("/envelope-fern-closed-opt.webp"),asset("/envelope-fern-open-opt.webp"),asset(`/growth-stages/stage-${stage}.webp`)].forEach(src=>{const i=new Image();i.src=src})},[batch,stage]);
 const music=async()=>{if(!musicRef.current||!sound)return;musicRef.current.volume=volume;try{await musicRef.current.play()}catch{}};
 const choose=(w:string)=>{if(!matched.includes(w)){setSelected(w);setFeedback(`Find the envelope for “${w}”`)}};
 const match=(target:string,source?:string)=>{const s=source||selected;if(!s||matched.includes(s))return;const pair=PAIRS.find(x=>x[0]===s);if(pair?.[1]!==target){setWrong(target);setStreak(0);setFeedback("Wrong address — try again.");setTimeout(()=>{setWrong(null);setSelected(null);setFeedback("Pick up a Polaroid and find its opposite envelope")},600);return}
   const next=[...matched,s], ns=streak+1; setMatched(next);setStreak(ns);setSelected(null);setFeedback(ns>=3?`${ns} perfect deliveries in a row!`:"Perfect delivery — sealed with care.");
   if(next.length===PAIRS.length){setTimeout(()=>{musicRef.current?.pause();setScreen("finish")},550);return}
   const batchDone=cards.every(w=>next.includes(w)); if(batchDone){setFeedback("Mailbag complete — bringing the next letters...");setTimeout(()=>{setBatch(b=>b+1);setSelected(null);setFeedback("Pick up a Polaroid and find its opposite envelope")},450)};
 };
 const reset=()=>{musicRef.current?.pause();if(musicRef.current)musicRef.current.currentTime=0;setBatch(0);setSelected(null);setMatched([]);setStreak(0);setFeedback("Pick up a Polaroid and find its opposite envelope");setScreen("start")};
 return <main className={`site-shell screen-${screen}`}><div className="grain"/><audio ref={musicRef} src={asset("/pressed-ferns.mp3")} loop preload="metadata"/>
 <div className="audio-controls"><button className="sound-btn" onClick={()=>{setSound(v=>!v);if(sound)musicRef.current?.pause();else setTimeout(()=>void music(),0)}}>{sound?<Volume2 size={18}/>:<VolumeX size={18}/>}</button><label className="volume-control"><input type="range" min="0" max="1" step=".01" value={volume} onChange={e=>{const v=+e.target.value;setVolume(v);if(musicRef.current)musicRef.current.volume=v}}/></label></div>
 {screen==="start"&&<section className="start-letter enter"><div className="start-props" aria-hidden="true"><div className="start-polaroid"><img src={photoFor("confident")} alt=""/><span>confident</span></div><img className="start-envelope" src={asset("/envelope-fern-closed-opt.webp")} alt=""/><img className="start-quill" src={asset("/quill-cursor.png")} alt=""/></div><div className="wax-seal">A</div><p className="eyebrow">The Academy Mailroom · Special Delivery</p><h1>Match the<br/><em>opposites</em></h1><div className="rule"/><p className="intro">Deliver every Polaroid to the envelope<br/>marked with its opposite adjective.</p><div className="preview-mail" aria-hidden="true"><div className="mini-photo">confident</div><span>→</span><div className="mini-envelope">shy</div></div><button className="primary-btn" onClick={()=>{setScreen("game");void music()}}>Open the mailroom <span>→</span></button><p className="tiny-note">14 deliveries · no timer · take your time</p></section>}
 {screen==="game"&&<section className="mailroom enter"><header className="game-header"><div><h2>Match the opposites</h2><p>Drag a Polaroid into its opposite envelope.</p></div></header><div className="counter"><strong>{matched.length}</strong><span>/ {PAIRS.length} pairs</span><i><b style={{width:`${matched.length/PAIRS.length*100}%`}}/></i><Sparkles size={22}/></div><div className="desk-layout"><section className="polaroid-tray"><div className="polaroid-grid">{cards.map((word,i)=>{const sent=matched.includes(word);return <button key={`${batch}-${word}`} draggable={!sent} onDragStart={e=>{e.dataTransfer.setData("text/plain",word);choose(word)}} onClick={()=>choose(word)} disabled={sent} className={`polaroid angle-${i%4} ${selected===word?"selected":""} ${sent?"sent":""}`}><span className="photo-window"><img src={photoFor(word)} alt="" draggable={false}/><i>{String(start+i+1).padStart(2,"0")}</i></span><strong>{word}</strong></button>})}</div></section><section className="envelope-tray"><div className="envelope-grid">{envelopes.map((word,i)=>{const source=PAIRS.find(x=>x[1]===word)?.[0]||"",sealed=matched.includes(source);return <button key={`${batch}-${word}`} onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault();match(word,e.dataTransfer.getData("text/plain"))}} onClick={()=>match(word)} disabled={sealed} className={`envelope angle-${(i+2)%4} ${selected?"ready":""} ${wrong===word?"wrong":""} ${sealed?"sealed":""}`}><span className="envelope-art"><img className="envelope-closed" src={asset("/envelope-fern-closed-opt.webp")} alt=""/><img className="envelope-open" src={asset("/envelope-fern-open-opt.webp")} alt=""/></span><span className="envelope-word">{word}</span>{sealed&&<span className="seal-mark">✓</span>}</button>})}</div></section><aside className="garden-card"><div className="plant-stage"><img key={stage} src={asset(`/growth-stages/stage-${stage}.webp`)} alt="plant" className="growing-plant growth-stage-image"/>{matched.length===1&&<img src={asset("/growth-stages/seed.webp")} alt="" className="falling-seed"/>}{streak>=3&&<Sparkles className="sparkle" size={26}/>}</div></aside></div><div className="feedback-plaque"><span>{feedback}</span><small>{streak>1?`✦ ${streak} in a row`:"Special delivery"}</small></div></section>}
 {screen==="finish"&&<section className="finish-letter enter"><div className="finish-plant"><img src={asset("/growth-stages/stage-7.webp")} alt="A fully grown potted peony"/></div><p className="eyebrow">All fourteen letters delivered</p><h1>Perfectly<br/><em>addressed!</em></h1><p className="intro">Every opposite found. Every envelope sealed.</p><button className="primary-btn" onClick={reset}><RotateCcw size={17}/> Play again</button></section>}
 </main>
}
