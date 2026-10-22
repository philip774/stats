'use client';
import {useEffect,useState} from 'react';
import {ArrowUpRight,RefreshCw} from 'lucide-react';
import {forecast,percentages,predictionState} from '../lib/predictions.mjs';
import type {Detail,Game,PredictionBaseline} from '../lib/types';

function useBaseline(game:Game){
 const [data,setData]=useState<PredictionBaseline|null>(null),[error,setError]=useState(''),[retry,setRetry]=useState(0);
 useEffect(()=>{
  const controller=new AbortController();setData(null);setError('');
  const url='/api/prediction?'+new URLSearchParams({group:game.groupId,date:game.date,home:game.home,away:game.away});
  const load=async()=>{try{const response=await fetch(url,{signal:controller.signal});const result=await response.json() as PredictionBaseline;if(!response.ok)throw new Error(result.error||'Prognosen kunde inte hämtas.');if(!controller.signal.aborted){setData(result);setError('')}}catch(e){if(!controller.signal.aborted)setError((e as Error).message)}};
  load();const timer=setInterval(()=>{if(document.visibilityState==='visible')load()},60000);
  const visible=()=>{if(document.visibilityState==='visible')load()};document.addEventListener('visibilitychange',visible);
  return()=>{controller.abort();clearInterval(timer);document.removeEventListener('visibilitychange',visible)};
 },[game.groupId,game.date,game.home,game.away,retry]);
 return {data,error,retry:()=>setRetry(n=>n+1)};
}
const percentLabel=(p:number,n:number)=>p>0&&n===0?'<1 %':p<1&&n===100?'>99 %':n+' %';
function Chances({title,labels,values}:{title:string;labels:string[];values:number[]}){
 const rounded=percentages(values);
 return <section className="chance-section"><h4>{title}</h4><div className="chance-bar" aria-hidden="true">{values.map((value,i)=><i key={i} style={{width:(100*value)+'%'}}/>)}</div><div className="chance-labels">{labels.map((label,i)=><div key={label}><b>{percentLabel(values[i],rounded[i])}</b><span>{label}</span></div>)}</div></section>;
}
const unavailable:Record<string,string>={clock:'Liveprognosen väntar på rapporterad matchklocka och ställning.',stale:'Matchklockan är inte tillräckligt färsk. Prognosen återkommer när källan uppdateras.',source:'Liveuppgifterna kunde inte bekräftas. Prognosen väntar på nästa uppdatering.',overtime:'Ordinarie tid är slut. Förlängning och straffar ingår inte i den här modellen.'};

export function MatchPredictions({game,detail,detailError}:{game:Game;detail:Detail|null;detailError:boolean}){
 const {data,error,retry}=useBaseline(game),[now,setNow]=useState(()=>Date.now());
 useEffect(()=>{const update=()=>setNow(Date.now()),timer=setInterval(update,15000);document.addEventListener('visibilitychange',update);return()=>{clearInterval(timer);document.removeEventListener('visibilitychange',update)}},[]);
 const state=predictionState(game,detail,now,detailError);
 const result=data?.available&&state.elapsedSeconds!==undefined?forecast(data.homeRate,data.awayRate,state.homeScore,state.awayScore,state.elapsedSeconds):null;
 if(state.state==='finished')return <div className="match-predictions"><div className="prediction-empty"><h4>Matchen är avgjord</h4><p>Liveprognosen avslutas när slutresultatet rapporteras.</p></div></div>;
 return <div className="match-predictions">
  <div className="prediction-title"><h3>Modellprognos</h3><span className={state.state==='live'?'prediction-live':''}>{state.state==='live'?(detail?.clock?.phase==='intermission'?'Paus':'Live'):'60 minuter'}</span></div>
  {state.state==='unavailable'?<p className="prediction-empty" role="status">{unavailable[state.reason||'clock']}</p>:error?<div className="notice error" role="alert"><p>{error}</p><button onClick={retry}>Försök igen</button></div>:!data?<div className="detail-loading" role="status"><RefreshCw size={18} className="spin"/>Beräknar prognos…</div>:!data.available?<div className="prediction-empty"><h4>För lite matchhistorik</h4><p>Det behövs minst fyra tidigare matcher i serien och minst en för vardera laget. Prognoser visas när det finns underlag.</p></div>:result?<>
   <p className="prediction-context">{state.state==='live'?`${detail?.clock?.display} spelat · period ${detail?.clock?.period} · ${state.homeScore}–${state.awayScore}`:'Inför matchen · ordinarie tid'}</p>
   {Math.min(data.homeGames||0,data.awayGames||0)<5&&<p className="prediction-context">Begränsat underlag: {data.homeGames} respektive {data.awayGames} tidigare matcher för lagen.</p>}
   <Chances title="Vinstchans · ordinarie tid" labels={[game.home,'Oavgjort',game.away]} values={[result.result.home,result.result.draw,result.result.away]}/>
   <Chances title="Nästa mål före 60:00" labels={[game.home,'Inga fler mål',game.away]} values={[result.nextGoal.home,result.nextGoal.none,result.nextGoal.away]}/>
   <div className="prediction-goals"><h4>{state.state==='live'?'Förväntade mål kvar':'Förväntade mål · 60 min'}</h4><div><span>{game.home}</span><b>{result.expectedRemaining.home.toLocaleString('sv-SE',{maximumFractionDigits:1})}</b></div><div><span>{game.away}</span><b>{result.expectedRemaining.away.toLocaleString('sv-SE',{maximumFractionDigits:1})}</b></div><footer><span>{result.horizonSeconds===300?'Mål inom 5 spelminuter':'Mål före 60:00'}</span><b>{Math.round(100*result.goalWithinFiveMinutes)} %</b></footer></div>
   <p className="table-key">Beräknat av appen från rapporterade resultat.{state.state==='live'?' Räknas om när resultat och matchklocka uppdateras, var 30:e sekund.':' Livevärden visas när matchen rapporteras.'}</p>
  </>:null}
  <details className="prediction-method"><summary>Underlag & hur det beräknas</summary><p>En enkel Poissonmodell uppskattar mål från lagens tidigare anfall och försvar i samma serie. Små underlag dras mot seriens målsnitt. Hemmafördel hämtas från seriens resultat.</p><p>Ställningen och rapporterad speltid styr liveberäkningen. Klockan räknas aldrig fram från nedsläppstid eller senaste händelsen. Nästa mål inkluderar möjligheten att inget mer mål görs före 60:00.</p><p>Modellen är inte kalibrerad för varje liga. Den tar inte hänsyn till skottkvalitet, aktuell utvisningssituation, tom kasse, skador eller laguppställningar. Måluppskattningen är inte skottbaserat xG.</p>{data?.available&&<><p className="prediction-sample">{data.historyGames} tidigare matcher i serien · {data.homeGames} för {game.home} · {data.awayGames} för {game.away}. Endast matcher före matchdagen används.</p>{!!data.approximateGames&&<p>{data.approximateGames} matcher saknar fullständiga periodsiffror. Deras slutresultat används, vilket kan påverka målsnittet.</p>}<p>Underlag {data.from}–{data.through}. Modell {data.model}.</p></>}{detail?.sourceUpdated&&state.state!=='pregame'&&<p>Källans senaste rapport: {detail.sourceUpdated} (svensk tid).</p>}<a href={data?.sourceUrl||'https://stats.swehockey.se/ScheduleAndResults/Schedule/'+game.groupId} target="_blank" rel="noreferrer">Resultat hos Swehockey <ArrowUpRight size={13}/></a></details>
 </div>;
}
