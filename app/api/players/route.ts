import {GROUPS} from '../../../lib/hockey.mjs';
import {playerFeed} from '../../../lib/player-feed.mjs';
import {addOfficialPhotos} from '../../../lib/official-players.mjs';
export const dynamic='force-dynamic';
export const runtime='nodejs';
export const maxDuration=60;
export async function GET(request:Request){
 const group=GROUPS.find(g=>g.id===new URL(request.url).searchParams.get('group'));
 if(!group)return Response.json({error:'Ogiltig serie.'},{status:400});
 try{const feed=await playerFeed(group);return Response.json({group,...feed,players:await addOfficialPhotos(feed.players,group.leagueId),checkedAt:new Date().toISOString()},{headers:{'Cache-Control':'public, max-age=60, s-maxage=120'}})}catch{return Response.json({error:'Spelarna kunde inte hämtas från Swehockey.'},{status:502})}
}
