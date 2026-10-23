import {GROUPS} from '../../../lib/hockey.mjs';
import {playerFeed} from '../../../lib/player-feed.mjs';
import {playerExtras} from '../../../lib/official-players.mjs';
import {nhlExtras,mergeNhlHistory} from '../../../lib/nhl-players.mjs';
export const dynamic='force-dynamic';
export const runtime='nodejs';
export const maxDuration=60;
export async function GET(request:Request){
 const query=new URL(request.url).searchParams,group=GROUPS.find(g=>g.id===query.get('group'));
 const name=query.get('name'),team=query.get('team');
 if(!group||!name||!team||name.length>150||team.length>150)return Response.json({error:'Ogiltig spelare.'},{status:400});
 try{
  const feed=await playerFeed(group),player=feed.players.find(p=>p.sourceName===name&&p.team===team);
  if(!player)return Response.json({error:'Spelaren hittades inte i denna serie.'},{status:404});
  const results=await Promise.allSettled([playerExtras(player),nhlExtras(player)]);
  const official=results[0].status==='fulfilled'?results[0].value:{photo:null,sourceUrl:null,history:[],games:[],available:false};
  const nhl=results[1].status==='fulfilled'?results[1].value:null;
  const history=mergeNhlHistory(official.history,nhl?.history||[]);
  return Response.json({...official,player,nhl,history,photo:official.photo||player.photo||nhl?.photo||null,available:official.available||!!nhl,partial:('partial' in official&&official.partial)||results.some(r=>r.status==='rejected'),checkedAt:new Date().toISOString()},{headers:{'Cache-Control':'public, max-age=60, s-maxage=120'}});
 }catch{return Response.json({error:'Spelarprofilen kunde inte uppdateras.'},{status:502})}
}
