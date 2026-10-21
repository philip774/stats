import {GROUPS,parseSchedule,source} from '../../../lib/hockey.mjs';
import {parseStandings} from '../../../lib/statistics.mjs';
export const dynamic='force-dynamic';
export const runtime='nodejs';
export const maxDuration=30;
export async function GET(request:Request) {
  const group=GROUPS.find(g=>g.id===new URL(request.url).searchParams.get('group'));
  if(!group)return Response.json({error:'Ogiltig serie.'},{status:400});
  const results=await Promise.allSettled([
    source('/ScheduleAndResults/Standings/'+group.id,60000).then(parseStandings),
    source('/ScheduleAndResults/Schedule/'+group.id).then(html=>parseSchedule(html,group))
  ]);
  if(results.every(r=>r.status==='rejected'))return Response.json({error:'Statistiken kunde inte hämtas från Swehockey.'},{status:502});
  const standings=results[0].status==='fulfilled'?results[0].value:null;
  const games=results[1].status==='fulfilled'?results[1].value:[];
  const today=new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Stockholm'}).format(new Date());
  games.forEach(g=>{if(g.homeScore!==null&&g.date<today)g.status='finished'});
  return Response.json({group,standings,games,partial:results.some(r=>r.status==='rejected'),checkedAt:new Date().toISOString()},{headers:{'Cache-Control':'public, max-age=30, s-maxage=60'}});
}
