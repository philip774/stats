import {clockTime} from './match-clock.mjs';

// A detail response belongs to a fixture only when both club names match.
/** @param {import('./types').Game} game @param {import('./types').Detail|null} detail */
export function matchStatus(game,detail=null,now=Date.now(),unavailable=false){
 const verified=detail?.home===game.home&&detail?.away===game.away?detail:null;
 const reports=[verified,game].filter(Boolean);
 const final=reports.find(report=>report.status==='finished');
 const report=final||reports.sort((a,b)=>(b.sourceUpdatedAt??0)-(a.sourceUpdatedAt??0))[0];
 const status=report.status,clock=status==='live'?report.clock:null;
 const fresh=!unavailable&&Number.isFinite(report.sourceUpdatedAt)&&now-report.sourceUpdatedAt<=300000&&report.sourceUpdatedAt-now<=120000;
 const period=clock?.period??null;
 const paused=clock?.phase==='intermission',shootout=clock?.phase==='shootout',overtime=clock?.phase==='overtime'||period>3;
 const stopped=clock?.phase==='stopped';
 const periodLabel=shootout?'Straffar':overtime?`Förlängning${period>4?' '+(period-3):''}`:period?`Period ${period}`:'';
 const label=status==='finished'?'Slut':status==='reported'?'Resultat rapporterat':status!=='live'?'Inför nedsläpp':!fresh?'Senast rapporterat':paused?'Periodpaus':shootout?'Straffar':stopped?'Spelavbrott':overtime?periodLabel:clock?`${periodLabel} · pågår`:'Matchtid saknas';
 const elapsed=Number.isInteger(clock?.elapsedSeconds)&&clock.elapsedSeconds>=0&&clock.elapsedSeconds<=3600?clock.elapsedSeconds:null;
 const periodSeconds=Number.isInteger(clock?.periodElapsedSeconds)?clock.periodElapsedSeconds:null;
 const total=elapsed===null?null:clockTime(elapsed),periodTime=periodSeconds===null?null:clockTime(periodSeconds);
 const compact=status==='finished'?'Slut':status==='reported'?'Resultat':status!=='live'?game.time:!fresh?'Senast':paused?'Paus':shootout?'Straffar':stopped?'Stopp':overtime?'Förl.':period?'P'+period:'Live';
 const secondary=status!=='live'?(status==='scheduled'?'':game.time):paused?(period?(periodSeconds===1200?`Efter P${period}`:`P${period}`):'Paus'):periodTime||(shootout?'GWS':period?'–:–':'Tid saknas');
 const note=status==='live'?unavailable?'Kunde inte uppdatera. Senaste rapporten visas.':!fresh?'Inväntar en färsk rapport från Swehockey.':paused?'Spelet har periodpaus enligt senaste rapporten.':shootout?'Straffläggning enligt senaste rapporten.':!clock?'Källan har inte publicerat en tydlig period och matchklocka.':!total&&!periodTime?'Perioden är rapporterad, men tydlig matchtid saknas.':'Rapporterad speltid. Uppdateras var 30:e sekund.':status==='finished'?'Slutresultat bekräftat.':status==='reported'?'Resultat finns. Matchstatus är inte bekräftad.':`Planerat nedsläpp ${game.time}.`;
 return {status,clock,period,paused,shootout,overtime,stopped,periodLabel,label,total,periodTime,elapsed,compact,secondary,note,fresh,live:status==='live'&&fresh&&!!clock,sourceUpdated:report.sourceUpdated||null,homeScore:report.homeScore,awayScore:report.awayScore};
}
