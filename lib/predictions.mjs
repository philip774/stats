export const MODEL_VERSION='poisson-v1';
const validScore=n=>Number.isInteger(n)&&n>=0&&n<=99;
const clamp=(n,min,max)=>Math.min(max,Math.max(min,n));

export function regulationScore(game){
 if(!validScore(game.homeScore)||!validScore(game.awayScore))return null;
 const periods=[...(game.periods||'').matchAll(/(\d+)\s*-\s*(\d+)/g)];
 if(periods.length>=3){
  const home=periods.slice(0,3).reduce((n,p)=>n+Number(p[1]),0),away=periods.slice(0,3).reduce((n,p)=>n+Number(p[2]),0);
  if(home<=game.homeScore&&away<=game.awayScore)return {home,away,exact:true};
 }
 // Do not train on overtime/shootout totals when regulation scores are missing.
 if(/(?:OT|GWS|SO|overtime|straff|förläng)/i.test(game.periods||''))return null;
 return {home:game.homeScore,away:game.awayScore,exact:false};
}

export function buildBaseline(games,target){
 const seen=new Set();
 const history=games.filter(g=>{
  const key=JSON.stringify([g.groupId,g.date,g.home,g.away]);
  if(g.groupId!==target.groupId||g.date>=target.date||g.status!=='finished'||seen.has(key))return false;
  seen.add(key);return !!regulationScore(g);
 }).map(game=>({game,score:regulationScore(game)}));
 const home=history.filter(({game})=>game.home===target.home||game.away===target.home);
 const away=history.filter(({game})=>game.home===target.away||game.away===target.away);
 if(history.length<4||!home.length||!away.length)return {available:false,reason:'history',model:MODEL_VERSION};
 const total=history.reduce((n,{score})=>n+score.home+score.away,0),average=total/(2*history.length);
 if(average<=0)return {available:false,reason:'history',model:MODEL_VERSION};
 const teamRate=(entries,team,conceded)=>{
  const goals=entries.reduce((n,{game,score})=>n+((game.home===team)!==conceded?score.home:score.away),0);
  return (goals+8*average)/(entries.length+8);
 };
 const homeBase=(history.reduce((n,{score})=>n+score.home,0)+8*average)/(history.length+8);
 const awayBase=(history.reduce((n,{score})=>n+score.away,0)+8*average)/(history.length+8);
 const homeRate=clamp(homeBase*teamRate(home,target.home,false)*teamRate(away,target.away,true)/(average*average),.05,12);
 const awayRate=clamp(awayBase*teamRate(away,target.away,false)*teamRate(home,target.home,true)/(average*average),.05,12);
 return {available:true,model:MODEL_VERSION,homeRate,awayRate,historyGames:history.length,homeGames:home.length,awayGames:away.length,
  approximateGames:history.filter(({score})=>!score.exact).length,
  from:history.map(({game})=>game.date).sort()[0],through:history.map(({game})=>game.date).sort().at(-1)};
}

function poisson(mean){
 const values=[Math.exp(-mean)];let cumulative=values[0];
 for(let k=1;k<150&&1-cumulative>1e-12;k++){values.push(values[k-1]*mean/k);cumulative+=values[k]}
 return values.map(value=>value/cumulative);
}
export function forecast(homeRate,awayRate,homeScore,awayScore,elapsedSeconds){
 if(![homeRate,awayRate].every(n=>typeof n==='number'&&Number.isFinite(n)&&n>0&&n<=12)||![homeScore,awayScore].every(validScore)||!Number.isInteger(elapsedSeconds)||elapsedSeconds<0||elapsedSeconds>3600)return null;
 const remaining=(3600-elapsedSeconds)/3600,homeMean=homeRate*remaining,awayMean=awayRate*remaining;
 const hp=poisson(homeMean),ap=poisson(awayMean);let home=0,draw=0,away=0;
 for(let h=0;h<hp.length;h++)for(let a=0;a<ap.length;a++){
  const p=hp[h]*ap[a],difference=homeScore+h-awayScore-a;
  if(difference>0)home+=p;else if(difference<0)away+=p;else draw+=p;
 }
 const noMore=Math.exp(-homeMean-awayMean),goal=1-noMore,rate=homeRate+awayRate;
 return {result:{home,draw,away},nextGoal:{home:goal*homeRate/rate,away:goal*awayRate/rate,none:noMore},expectedRemaining:{home:homeMean,away:awayMean},
  goalWithinFiveMinutes:1-Math.exp(-rate*Math.min(300,3600-elapsedSeconds)/3600),horizonSeconds:Math.min(300,3600-elapsedSeconds)};
}

export function predictionState(game,detail,now=Date.now(),detailError=false){
 if(detail&&(detail.home&&detail.home!==game.home||detail.away&&detail.away!==game.away))return {state:'unavailable',reason:'source'};
 if(detail?.status==='finished'||game.status==='finished')return {state:'finished'};
 if(detailError)return {state:'unavailable',reason:'source'};
 if(detail?.status==='live'||game.status==='live'||game.homeScore!==null&&game.homeScore!==undefined){
  if(detail?.clock?.phase==='overtime'||detail?.clock?.phase==='shootout')return {state:'unavailable',reason:'overtime'};
  if(!detail?.clock||!Number.isInteger(detail.clock.elapsedSeconds)||detail.clock.elapsedSeconds<0||detail.clock.elapsedSeconds>3600||!validScore(detail.homeScore)||!validScore(detail.awayScore))return {state:'unavailable',reason:'clock'};
  if(typeof detail.sourceUpdatedAt!=='number'||now-detail.sourceUpdatedAt>300000||detail.sourceUpdatedAt-now>120000)return {state:'unavailable',reason:'stale'};
  return {state:'live',elapsedSeconds:detail.clock.elapsedSeconds,homeScore:detail.homeScore,awayScore:detail.awayScore};
 }
 const local=new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Stockholm',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(new Date(now)).replace(',','');
 if(!/^\d{2}:\d{2}$/.test(game.time)||game.date+' '+game.time<=local)return {state:'unavailable',reason:'clock'};
 return {state:'pregame',elapsedSeconds:0,homeScore:0,awayScore:0};
}

// Largest-remainder rounding keeps the three displayed outcomes at exactly 100%.
export function percentages(values){
 const total=values.reduce((n,v)=>n+v,0);if(!Number.isFinite(total)||total<=0)return values.map(()=>0);
 const raw=values.map(value=>100*value/total),rounded=raw.map(Math.floor);
 const order=raw.map((value,index)=>({index,fraction:value-rounded[index]})).sort((a,b)=>b.fraction-a.fraction);
 const remainder=100-rounded.reduce((n,v)=>n+v,0);
 for(let i=0;i<remainder;i++)rounded[order[i].index]++;
 return rounded;
}
