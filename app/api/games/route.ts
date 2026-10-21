import {GROUPS,parseSchedule,parseEvents,source} from '../../../lib/hockey.mjs';
export const dynamic='force-dynamic';
export const runtime='nodejs';
export const maxDuration=60;
export async function GET(request:Request){
 const today=new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Stockholm'}).format(new Date());
 const date=new URL(request.url).searchParams.get('date')||today;
 if(!/^\d{4}-\d{2}-\d{2}$/.test(date))return Response.json({error:'Invalid date'},{status:400});
 const results=await Promise.allSettled(GROUPS.map(async group=>parseSchedule(await source('/ScheduleAndResults/Schedule/'+group.id),group)));
 const games=results.flatMap(r=>r.status==='fulfilled'?r.value:[]);
 const teamGroups=Object.fromEntries(games.flatMap(g=>[[g.home,g.groupId],[g.away,g.groupId]]));
 const liveFailures:string[]=[];
 if(date===today){
 const liveResults=await Promise.allSettled(GROUPS.map(async group=>{
 const html=await source('/StatPage/Live/'+group.id+'/');
 const ids=[...new Set([...html.matchAll(/\/Game\/(?:Events|LineUps|Reports)\/(\d+)/g)].map(m=>m[1]))];
 await Promise.all(ids.map(async id=>{
 const live=parseEvents(await source('/Game/Events/'+id));
 const g=games.find(g=>g.groupId===group.id&&g.date===today&&g.home===live.home&&g.away===live.away);
 if(g){g.eventId=id;g.status=live.status;if(live.homeScore!==null){g.homeScore=live.homeScore;g.awayScore=live.awayScore;}}
 }));
 }));
 GROUPS.forEach((g,i)=>{if(liveResults[i].status==='rejected')liveFailures.push(g.name)});
 }
 await Promise.allSettled(games.filter(g=>g.date===date&&g.date===today&&g.eventId&&g.status==='reported').map(async g=>{const live=parseEvents(await source('/Game/Events/'+g.eventId));g.status=live.status;if(live.homeScore!==null){g.homeScore=live.homeScore;g.awayScore=live.awayScore;}}));
 games.forEach(g=>{if(g.date<today&&g.homeScore!==null)g.status='finished';});
 const failed=[...new Set([...GROUPS.filter((_,i)=>results[i].status==='rejected').map(g=>g.name),...liveFailures])];
 return Response.json({games:games.filter(g=>g.date===date),dates:[...new Set(games.map(g=>g.date))].sort(),teamGroups,teams:[...new Set(games.flatMap(g=>[g.home,g.away]))].sort(),groups:GROUPS,failed,checkedAt:new Date().toISOString(),source:'https://stats.swehockey.se',error:failed.length===GROUPS.length?'Kunde inte hämta matcher från Swehockey. Försök igen.':null},{status:failed.length===GROUPS.length?502:200,headers:{'Cache-Control':'public, max-age=15, s-maxage=25'}});
}
