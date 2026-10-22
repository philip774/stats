import {GROUPS,parseSchedule,source} from '../../../lib/hockey.mjs';
import {buildBaseline} from '../../../lib/predictions.mjs';
export const dynamic='force-dynamic';
export const runtime='nodejs';
export const maxDuration=30;

export async function GET(request:Request){
 const query=new URL(request.url).searchParams,group=GROUPS.find(g=>g.id===query.get('group'));
 const date=query.get('date'),home=query.get('home'),away=query.get('away');
 if(!group||!date||!/^\d{4}-\d{2}-\d{2}$/.test(date)||!home||!away||home.length>150||away.length>150)return Response.json({error:'Ogiltig match.'},{status:400});
 try{
  const games=parseSchedule(await source('/ScheduleAndResults/Schedule/'+group.id,60000),group);
  const target=games.find(game=>game.date===date&&game.home===home&&game.away===away);
  if(!target)return Response.json({error:'Matchen hittades inte i denna serie.'},{status:404});
  const today=new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Stockholm'}).format(new Date());
  for(const game of games)if(game.date<today&&game.homeScore!==null)game.status='finished';
  return Response.json({...buildBaseline(games,target),checkedAt:new Date().toISOString(),sourceUrl:'https://stats.swehockey.se/ScheduleAndResults/Schedule/'+group.id},{headers:{'Cache-Control':'public, max-age=30, s-maxage=60'}});
 }catch{return Response.json({error:'Prognosunderlaget kunde inte hämtas.'},{status:502})}
}
