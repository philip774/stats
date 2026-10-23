export const clockTime=seconds=>String(Math.floor(seconds/60)).padStart(2,'0')+':'+String(seconds%60).padStart(2,'0');

// Only the scoreboard is a clock source. An event timestamp is not the game clock.
export function parseMatchClock(scoreboard){
 const text=scoreboard.replace(/\s+/g,' ').trim();
 if(/(?:Final Score|Game Ended|Matchen slut|Not Started|Game Preview|Scheduled)/i.test(text))return null;
 if(/(?:shootout|penalty shots|straffar)/i.test(text))return {period:null,elapsedSeconds:null,periodElapsedSeconds:null,phase:'shootout',display:'Straffar'};
 const periodMatch=text.match(/\b([1-9])(?:st|nd|rd|th)\s*(?:period|intermission)\b/i)||text.match(/\b(?:period|per\.?)\s*([1-9])\b(?!:\d)/i);
 const overtime=/overtime|förlängning/i.test(text);
 const pause=/intermission|paus|period break|end of (?:the )?(?:[1-9](?:st|nd|rd|th) )?period|period\s*[1-9]?\s*ended/i.test(text);
 if(!periodMatch&&!overtime&&!pause)return null;
 const period=periodMatch?Number(periodMatch[1]):overtime?4:null;
 const phase=pause?'intermission':overtime||period>3?'overtime':/stoppage|time[- ]?out|avbrott/i.test(text)?'stopped':'regulation';
 let elapsedSeconds=null,periodElapsedSeconds=null;
 const times=[...text.matchAll(/\b(\d{1,2}):([0-5]\d)\b/g)];
 // An explicitly ended period establishes the boundary even without a clock.
 const ended=/end of|ended|efter|\b[1-9](?:st|nd|rd|th)\s*intermission/i.test(text);
 if(pause&&ended&&period&&period<=3){elapsedSeconds=period*1200;periodElapsedSeconds=1200}
 else if(times.length===1&&period&&!/remaining|time left|kvar/i.test(text)){
  const seconds=Number(times[0][1])*60+Number(times[0][2]);
  if(period<=3){
   if(period===1&&seconds<=1200)elapsedSeconds=seconds;
   else if(period>1&&seconds<1200)elapsedSeconds=(period-1)*1200+seconds;
   else if(period>1&&seconds>(period-1)*1200&&seconds<=period*1200)elapsedSeconds=seconds;
   // 20:00 in period two is ambiguous unless the source explicitly ends it.
   if(elapsedSeconds!==null)periodElapsedSeconds=elapsedSeconds-(period-1)*1200;
  }else if(seconds<1200)periodElapsedSeconds=seconds; // OT length varies; no assumed total.
 }
 return {period,elapsedSeconds,periodElapsedSeconds,phase,display:elapsedSeconds!==null?clockTime(elapsedSeconds):phase==='intermission'?'Periodpaus':phase==='overtime'?'Förlängning':`Period ${period}`};
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
