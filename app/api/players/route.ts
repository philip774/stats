import {GROUPS,source} from '../../../lib/hockey.mjs';
import {mergePlayers,parseRoster,parseTeamPlayers} from '../../../lib/players.mjs';
export const dynamic='force-dynamic';
export const runtime='nodejs';
export const maxDuration=30;
export async function GET(request:Request){
 const group=GROUPS.find(g=>g.id===new URL(request.url).searchParams.get('group'));
 if(!group)return Response.json({error:'Ogiltig serie.'},{status:400});
 const results=await Promise.allSettled([
  source('/Teams/Info/TeamRoster/'+group.id,300000).then(parseRoster),
  source('/Teams/Info/PlayersByTeam/'+group.id,60000).then(parseTeamPlayers)
 ]);
 if(results.every(r=>r.status==='rejected'))return Response.json({error:'Spelarna kunde inte hämtas från Swehockey.'},{status:502});
 const roster=results[0].status==='fulfilled'?results[0].value:[];
 const stats=results[1].status==='fulfilled'?results[1].value:[];
 return Response.json({group,players:mergePlayers(roster,stats,group),partial:results.some(r=>r.status==='rejected'),checkedAt:new Date().toISOString()},{headers:{'Cache-Control':'public, max-age=60, s-maxage=120'}});
}
