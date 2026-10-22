import {GROUPS} from '../../../lib/hockey.mjs';
import {teamStats} from '../../../lib/team-stats.mjs';
export const dynamic='force-dynamic';
export const runtime='nodejs';
export const maxDuration=30;
export async function GET(request:Request){
 const group=GROUPS.find(g=>g.id===new URL(request.url).searchParams.get('group'));
 if(!group)return Response.json({error:'Ogiltig serie.'},{status:400});
 try{return Response.json({group,...await teamStats(group),checkedAt:new Date().toISOString()},{headers:{'Cache-Control':'public, max-age=60, s-maxage=120'}})}
 catch{return Response.json({error:'Utökad lagstatistik kunde inte hämtas för serien.'},{status:502})}
}
