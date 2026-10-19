export const GROUPS = [
{id:'21213',name:'Syd A',region:'Syd'},{id:'21214',name:'Syd B',region:'Syd'},
{id:'21088',name:'Väst A',region:'Väst'},{id:'21089',name:'Väst B',region:'Väst'},{id:'21090',name:'Väst C',region:'Väst'},
{id:'21505',name:'Östra',region:'Öst'},
{id:'21319',name:'Norr A',region:'Norr'},{id:'21320',name:'Norr B',region:'Norr'},{id:'21321',name:'Norr C',region:'Norr'}];
export const text=s=>s.replace(/<[^>]*>/g,' ').replace(/&#x([0-9a-f]+);/gi,(_,n)=>String.fromCodePoint(parseInt(n,16))).replace(/&#(\d+);/g,(_,n)=>String.fromCodePoint(+n)).replace(/&nbsp;/g,' ').replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/\s+/g,' ').trim();
export const cells=row=>[...row.matchAll(/<td\b[^>]*\/>|<td\b[^>]*>([\s\S]*?)<\/td>/gi)].map(m=>text(m[1]||''));
export function parseSchedule(html,group){
 let date='';const games=[];
 for(const row of html.match(/<tr\b[^>]*>[\s\S]*?<\/tr>/gi)||[]){
 let c=cells(row);if(c.length===7&&/\d{4}-\d{2}-\d{2}/.test(c[1])){const dt=c[1];c=[dt.slice(0,10),'',dt.slice(11),...c.slice(2)];}if(c.length!==8)continue;
 const d=c[0].match(/\d{4}-\d{2}-\d{2}/)||c[1].match(/\d{4}-\d{2}-\d{2}/);if(d)date=d[0];
 const teams=c[3].split(/\s+-\s+/);if(teams.length!==2||!date)continue;
 const score=c[4].match(/(\d+)\s*-\s*(\d+)/);const eventId=row.match(/\/Game\/Events\/(\d+)/)?.[1];
 const time=c[2].match(/\d{2}:\d{2}/)?.[0]||c[0].match(/\d{2}:\d{2}/)?.[0]||'–';
 games.push({id:group.id+'-'+(eventId||date+'-'+teams[0]),eventId,date,time,home:teams[0],away:teams[1],homeScore:score?+score[1]:null,awayScore:score?+score[2]:null,periods:c[5],venue:c[7],groupId:group.id,group:group.name,region:group.region,status:score?'reported':'scheduled'});
 }if(!games.length)throw new Error('Schedule format not recognized');return games;
}
export function parseEvents(html){
 const plain=text(html);const final=/Final Score/i.test(plain);
 const area=html.match(/<td[^>]*class="tdInfoArea"[^>]*>([\s\S]*?)<\/td>/i)?.[1]||'';
 const score=text(area).match(/(\d+)\s*-\s*(\d+)/)||plain.match(/(\d+)\s*[-:]\s*(\d+)\s*(?:\([^)]*\))?\s*(?:Final Score|Period|Game)/i);
 const shots=[...html.matchAll(/>Shots<\/td>\s*<td[^>]*><strong>(\d+)<\/strong>/gi)].map(m=>+m[1]);const events=[];
 for(const row of html.match(/<tr\b[^>]*>[\s\S]*?<\/tr>/gi)||[]){const c=cells(row);if(c.length>=4&&/^\d{1,2}:\d{2}$/.test(c[0]))events.push({time:c[0],type:c[1],team:c[2],detail:c.slice(3).filter(Boolean).join(' · ')});}
 const teams=text(html.match(/<h2>([\s\S]*?)<\/h2>/i)?.[1]||'').split(/\s+-\s+/);
 if(!area||teams.length!==2)throw new Error('Game format not recognized');
 return {home:teams[0],away:teams[1],status:final?'finished':events.length?'live':'scheduled',label:final?'Slut':events.length?'Pågår':'Kommande',homeScore:score?+score[1]:null,awayScore:score?+score[2]:null,shots,events,sourceUpdated:plain.match(/Last update:\s*(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}(?::\d{2})?)/)?.[1]||null};
}
const cache=new Map();
export async function source(path,ttl=25000){const key='https://stats.swehockey.se'+path;const old=cache.get(key);if(old&&Date.now()-old.time<ttl)return old.html;const res=await fetch(key,{headers:{Accept:'text/html'},signal:AbortSignal.timeout(12000)});if(!res.ok)throw new Error('Official source returned '+res.status);const html=await res.text();if(!html.includes('TSMstats'))throw new Error('Unexpected source response');cache.set(key,{time:Date.now(),html});if(cache.size>160)cache.delete(cache.keys().next().value);return html;}
