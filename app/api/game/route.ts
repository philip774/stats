import {source,parseEvents} from '../../../lib/hockey.mjs';
export const dynamic='force-dynamic';
export const runtime='nodejs';
export const maxDuration=30;
export async function GET(request:Request){const id=new URL(request.url).searchParams.get('id');if(!id||!/^\d{5,10}$/.test(id))return Response.json({error:'Invalid game ID'},{status:400});try{return Response.json(parseEvents(await source('/Game/Events/'+id)),{headers:{'Cache-Control':'public, max-age=15, s-maxage=25'}});}catch{return Response.json({error:'Matchdetaljer är tillfälligt otillgängliga.'},{status:502});}}
