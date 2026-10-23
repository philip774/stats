'use client';
import {useEffect,useState} from 'react';
import {ArrowUpRight,RefreshCw} from 'lucide-react';
import type {Game,LineupFeed} from '../lib/types';

export function MatchLineups({game}:{game:Game}){
 const [open,setOpen]=useState(false),[data,setData]=useState<LineupFeed|null>(null),[error,setError]=useState(''),[side,setSide]=useState(0),[retry,setRetry]=useState(0);
 useEffect(()=>{
  setData(null);setError('');if(!open||!game.eventId)return;
  const controller=new AbortController();
  const load=async()=>{try{const response=await fetch('/api/lineup?id='+game.eventId,{signal:controller.signal});const result=await response.json() as LineupFeed;if(!response.ok)throw new Error(result.error||'Laguppställningen kunde inte hämtas.');if(result.home!==game.home||result.away!==game.away)throw new Error('Laguppställningen kunde inte kopplas till denna match.');if(!controller.signal.aborted){setData(result);setError('')}}catch(e){if(!controller.signal.aborted)setError((e as Error).message)}};
  load();const timer=setInterval(()=>{if(document.visibilityState==='visible')load()},60000);return()=>{controller.abort();clearInterval(timer)};
 },[open,game.eventId,game.home,game.away,retry]);
 const team=data?.teams.find(t=>t.team===(side===0?game.home:game.away));
 return <details className="match-lineups" open={open} onToggle={e=>setOpen(e.currentTarget.open)}><summary>Laguppställningar & domare</summary>{!game.eventId?<p className="quiet-text">Visas när matchens laguppställning publiceras.</p>:error?<div className="notice error" role="alert"><p>{error}</p><button onClick={()=>setRetry(n=>n+1)}>Försök igen</button></div>:!data?<div className="detail-loading" role="status"><RefreshCw size={17} className="spin"/>Hämtar laguppställning…</div>:<><div className="segmented lineup-sides">{[game.home,game.away].map((name,i)=><button key={name} className={side===i?'selected':''} aria-pressed={side===i} onClick={()=>setSide(i)}>{name}</button>)}</div>{team&&<div className="lineup-team">{team.units.map(unit=><section key={unit.label}><h4>{unit.label}</h4><ul>{unit.players.map(player=><li key={player.jersey+player.sourceName}><span>#{player.jersey}</span><b>{player.name}</b>{player.position&&<small>{player.position}</small>}</li>)}</ul></section>)}{team.coaches.length>0&&<section><h4>Tränare</h4>{team.coaches.map(coach=><p className="lineup-coach" key={coach.role+coach.name}><b>{coach.name}</b><small>{coach.role}</small></p>)}</section>}</div>}
 {(data.referees||data.linesmen)&&<div className="lineup-officials"><h4>Domare</h4>{data.referees&&<p><small>Huvuddomare</small>{data.referees}</p>}{data.linesmen&&<p><small>Linjedomare</small>{data.linesmen}</p>}</div>}<p className="table-key">Publicerad laguppställning. Kedjor och spelarordning kan ändras under matchen; startande målvakt antas inte från listans ordning.</p>{data.sourceUpdated&&<p className="table-key">Källan uppdaterad {data.sourceUpdated}</p>}<a className="player-source" href={data.sourceUrl} target="_blank" rel="noreferrer">Laguppställning hos Swehockey <ArrowUpRight size={13}/></a></>}</details>;
}
