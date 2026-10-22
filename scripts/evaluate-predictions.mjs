import {GROUPS,parseSchedule,source} from '../lib/hockey.mjs';
import {buildBaseline,forecast,regulationScore} from '../lib/predictions.mjs';

// Retrospective walk-forward check, using today's published historical records.
// This is not a calibration study or a replay of archived live reporting.
const today=new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Stockholm'}).format(new Date());
const rows=[];let cursor=0;
const brier=(probabilities,outcome)=>probabilities.reduce((sum,p,i)=>sum+(p-(i===outcome?1:0))**2,0);
await Promise.all(Array.from({length:3},async()=>{
 while(cursor<GROUPS.length){
  const group=GROUPS[cursor++];
  try{
   const games=parseSchedule(await source('/ScheduleAndResults/Schedule/'+group.id),group);
   for(const game of games)if(game.date<today&&game.homeScore!==null)game.status='finished';
   const upcoming=games.find(game=>game.date>=today&&game.homeScore===null);
   let count=0,score=0,referenceScore=0;
   for(const game of games.filter(game=>game.status==='finished')){
    const actual=regulationScore(game),model=buildBaseline(games,game);
    if(!actual?.exact||!model.available)continue;
    const p=forecast(model.homeRate,model.awayRate,0,0,0).result;
    const mean=(model.homeRate+model.awayRate)/2,ref=forecast(mean,mean,0,0,0).result;
    const outcome=actual.home>actual.away?0:actual.home===actual.away?1:2;
    count++;score+=brier([p.home,p.draw,p.away],outcome);referenceScore+=brier([ref.home,ref.draw,ref.away],outcome);
   }
   rows.push({group:group.id,league:group.league,availableForNextGame:upcoming?buildBaseline(games,upcoming).available:null,evaluated:count,brier:count?score/count:null,symmetricBrier:count?referenceScore/count:null});
  }catch{rows.push({group:group.id,league:group.league,error:'Source unavailable'})}
 }
}));
const evaluated=rows.reduce((sum,row)=>sum+(row.evaluated||0),0);
console.log(JSON.stringify({date:today,groups:rows.length,failed:rows.filter(row=>row.error).length,
 availableForNextGame:rows.filter(row=>row.availableForNextGame===true).length,withoutEnoughHistory:rows.filter(row=>row.availableForNextGame===false).map(row=>row.group),evaluated,
 brier:evaluated?rows.reduce((sum,row)=>sum+(row.brier||0)*(row.evaluated||0),0)/evaluated:null,
 symmetricBrier:evaluated?rows.reduce((sum,row)=>sum+(row.symmetricBrier||0)*(row.evaluated||0),0)/evaluated:null,rows},null,2));
