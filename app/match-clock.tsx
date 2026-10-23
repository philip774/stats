import {Clock3,Pause,Radio} from 'lucide-react';
import {matchStatus} from '../lib/match-status.mjs';
import type {Detail,Game} from '../lib/types';

export function CompactMatchStatus({state}:{state:ReturnType<typeof matchStatus>}){
 return <div className={'match-status'+(state.live?' is-live':'')+(state.paused||state.stopped?' clock-paused':'')}>
  {state.live&&(state.paused||state.stopped?<span className="pause-mark">Ⅱ</span>:<span className="live-dot"/>)}<b>{state.compact}</b>{state.secondary&&<small>{state.secondary}</small>}
 </div>;
}

export function MatchClockPanel({game,detail,now,unavailable=false}:{game:Game;detail:Detail|null;now:number;unavailable?:boolean}){
 const state=matchStatus(game,detail,now,unavailable);
 const Icon=state.paused||state.stopped?Pause:state.live?Radio:Clock3;
 const time=state.overtime?state.periodTime:state.total;
 return <section className={'match-clock-panel'+(state.live?' current':'')+(state.paused||state.stopped?' paused':'')} aria-label="Matchtid">
  <div className="clock-heading"><span><Icon size={14}/>{state.label}</span>{state.status==='live'&&<small>30 s</small>}</div>
  {state.status==='live'&&<>
   <div className="clock-reading"><div><strong>{state.shootout?'–':time||'–:–'}</strong><span>{state.shootout?'Ingen löpande matchtid':state.overtime?'Spelat i förlängningen':'Spelad matchtid'}</span></div><div className="clock-period"><b>{state.periodLabel||'Period saknas'}</b>{!state.shootout&&!state.overtime&&<span>{state.periodTime?state.periodTime+' av 20:00':'Periodtid saknas'}</span>}{state.paused&&<span>Paus · inväntar nedsläpp</span>}</div></div>
   {!state.overtime&&!state.shootout&&state.elapsed!==null&&<div className="clock-progress" aria-label={`${state.total} av 60:00 spelat`}>{[1,2,3].map(period=><div key={period}><span><i style={{width:Math.min(100,Math.max(0,((state.elapsed??0)-(period-1)*1200)/12))+'%'}}/></span><small>P{period}</small></div>)}</div>}
  </>}
  <p>{state.note}</p>
  {state.status==='live'&&state.sourceUpdated&&<small className="clock-source">Källans rapport: {state.sourceUpdated} · svensk tid</small>}
 </section>;
}
