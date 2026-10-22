import {GROUPS} from '../../../lib/hockey.mjs';
import {playerFeed} from '../../../lib/player-feed.mjs';
import {playerExtras} from '../../../lib/official-players.mjs';
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
  try{return Response.json({...await playerExtras(player),player,checkedAt:new Date().toISOString()},{headers:{'Cache-Control':'public, max-age=60, s-maxage=120'}})}
  catch{return Response.json({player,photo:null,sourceUrl:null,history:[],games:[],available:false,partial:true,checkedAt:new Date().toISOString()})}
 }catch{return Response.json({error:'Spelarprofilen kunde inte uppdateras.'},{status:502})}
}
