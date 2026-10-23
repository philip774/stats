import {source} from '../../../lib/hockey.mjs';
import {parseLineups} from '../../../lib/lineups.mjs';
export const dynamic='force-dynamic';
export const runtime='nodejs';
export const maxDuration=30;
export async function GET(request:Request){
 const id=new URL(request.url).searchParams.get('id');
 if(!id||!/^\d{5,10}$/.test(id))return Response.json({error:'Ogiltig match.'},{status:400});
 try{return Response.json({...parseLineups(await source('/Game/LineUps/'+id,60000)),sourceUrl:'https://stats.swehockey.se/Game/LineUps/'+id,checkedAt:new Date().toISOString()},{headers:{'Cache-Control':'public, max-age=30, s-maxage=60'}})}
 catch{return Response.json({error:'Laguppställningen är inte publicerad eller kunde inte hämtas.'},{status:502})}
}
