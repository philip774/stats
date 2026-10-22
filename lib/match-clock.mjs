// Only the scoreboard is a clock source. An event timestamp is not the game clock.
export function parseMatchClock(scoreboard){
 const text=scoreboard.replace(/\s+/g,' ').trim();
 if(/(?:Final Score|Game Ended|Matchen slut|Not Started|Game Preview|Scheduled)/i.test(text))return null;
 if(/(?:shootout|penalty shots|straffar)/i.test(text))return {period:5,elapsedSeconds:null,phase:'shootout',display:'Straffar'};
 if(/(?:overtime|förlängning)/i.test(text))return {period:4,elapsedSeconds:null,phase:'overtime',display:'Förlängning'};
 const periodMatch=text.match(/\b([1-4])(?:st|nd|rd|th)\s*period\b/i)||text.match(/\b(?:period|per\.?)\s*([1-4])\b(?!:\d)/i);
 if(!periodMatch)return null;
 const period=Number(periodMatch[1]);
 if(period>3)return {period,elapsedSeconds:null,phase:'overtime',display:'Förlängning'};
 // Never guess count-up versus count-down if the source explicitly says remaining.
 if(/(?:remaining|time left|kvar)/i.test(text))return null;
 const times=[...text.matchAll(/\b(\d{1,2}):([0-5]\d)\b/g)];
 if(times.length!==1)return null;
 const seconds=Number(times[0][1])*60+Number(times[0][2]);
 let elapsedSeconds;
 if(period===1&&seconds<=1200)elapsedSeconds=seconds;
 else if(period>1&&seconds<1200)elapsedSeconds=(period-1)*1200+seconds;
 else if(period>1&&seconds>(period-1)*1200&&seconds<=period*1200)elapsedSeconds=seconds;
 // At the 20:00 boundary the format can be ambiguous; wait for the next report.
 else return null;
 return {period,elapsedSeconds,phase:/intermission|paus|period break/i.test(text)?'intermission':'regulation',display:String(Math.floor(elapsedSeconds/60)).padStart(2,'0')+':'+String(elapsedSeconds%60).padStart(2,'0')};
}

export function stockholmTimestamp(value){
 const match=value?.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?$/);
 if(!match)return null;
 const [,y,m,d,h,min,s='0']=match,parts=[y,m,d,h,min,s].map(Number);
 const base=Date.UTC(parts[0],parts[1]-1,parts[2],parts[3],parts[4],parts[5]);
 const format=new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Stockholm',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'});
 const values=time=>Object.fromEntries(format.formatToParts(new Date(time)).map(p=>[p.type,p.value]));
 const local=values(base),offset=Date.UTC(+local.year,+local.month-1,+local.day,+local.hour,+local.minute,+local.second)-base;
 const time=base-offset,check=values(time);
 return [check.year,check.month,check.day,check.hour,check.minute,check.second].every((n,i)=>Number(n)===parts[i])?time:null;
}
