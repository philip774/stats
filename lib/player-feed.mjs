import {source} from './hockey.mjs';
import {mergePlayers,parseRoster,parseTeamPlayers} from './players.mjs';
export async function playerFeed(group){
 const results=await Promise.allSettled([
  source('/Teams/Info/TeamRoster/'+group.id,300000).then(parseRoster),
  source('/Teams/Info/PlayersByTeam/'+group.id,60000).then(parseTeamPlayers)
 ]);
 if(results.every(r=>r.status==='rejected'))throw new Error('Spelarna kunde inte hämtas från Swehockey.');
 return {players:mergePlayers(results[0].status==='fulfilled'?results[0].value:[],results[1].status==='fulfilled'?results[1].value:[],group),partial:results.some(r=>r.status==='rejected')};
}
