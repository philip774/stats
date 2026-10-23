import {normalizeName} from './official-players.mjs';
import {statNumber} from './numbers.mjs';
import {careerStage} from './career.mjs';

const leagues=new Set(['NHL','AHL','ECHL','OHL','WHL','QMJHL','NCAA','USHL']);
const cache=new Map();
async function memo(key,load){
 const old=cache.get(key);if(old&&Date.now()-old.time<21600000)return old.promise;
 const promise=load();cache.set(key,{time:Date.now(),promise});
 try{return await promise}catch(error){cache.delete(key);throw error}finally{if(cache.size>200)cache.delete(cache.keys().next().value)}
}
async function json(url){
 const response=await fetch(url,{headers:{Accept:'application/json'},signal:AbortSignal.timeout(7000)});
 if(!response.ok)throw new Error('NHL source unavailable');
 return response.json();
}
const label=value=>typeof value==='string'?value:value?.default||'';
const fraction=value=>{const n=statNumber(value);return n!==null&&n>=0&&n<=1?n*100:null};
const validTime=value=>typeof value==='string'&&/^\d+:[0-5]\d$/.test(value)?value:null;

export function matchesNhlIdentity(player,profile){
 return !!player.birthdate&&profile.birthDate===player.birthdate&&normalizeName(label(profile.firstName)+' '+label(profile.lastName))===normalizeName(player.name);
}
export function safeNhlPhoto(value,id){
 try{const url=new URL(value);return url.protocol==='https:'&&url.hostname==='assets.nhle.com'&&/^\d{7}$/.test(String(id))&&url.pathname.startsWith('/mugs/nhl/')&&url.pathname.endsWith('/'+id+'.png')?url.href:null}catch{return null}
}
export function parseNhlStats(stat={}){
 const played=statNumber(stat.gamesPlayed),goalsAgainst=statNumber(stat.goalsAgainst),shotsAgainst=statNumber(stat.shotsAgainst);
 return {played,goals:statNumber(stat.goals),assists:statNumber(stat.assists),points:statNumber(stat.points),plusMinus:statNumber(stat.plusMinus),penaltyMinutes:statNumber(stat.pim),
  savePercentage:played===0?null:fraction(stat.savePctg),gaa:played===0?null:statNumber(stat.goalsAgainstAvg),goalsAgainst,
  saves:shotsAgainst!==null&&goalsAgainst!==null&&shotsAgainst>=goalsAgainst?shotsAgainst-goalsAgainst:null,shutouts:statNumber(stat.shutouts),
  shots:statNumber(stat.shots),shotsAgainst,shootingPercentage:fraction(stat.shootingPctg),powerPlayGoals:statNumber(stat.powerPlayGoals),powerPlayPoints:statNumber(stat.powerPlayPoints),
  shortHandedGoals:statNumber(stat.shorthandedGoals),gameWinningGoals:statNumber(stat.gameWinningGoals),wins:statNumber(stat.wins),losses:statNumber(stat.losses),
  overtimeLosses:statNumber(stat.otLosses),averageIceTime:validTime(stat.avgToi),iceTime:validTime(stat.timeOnIce)};
}
export function parseNhlProfile(profile){
 const id=String(profile.playerId);if(!/^\d{7}$/.test(id))throw new Error('Invalid NHL identity');
 const sourceUrl='https://www.nhl.com/player/'+id;
 const history=(profile.seasonTotals||[]).filter(stat=>leagues.has(stat.leagueAbbrev)&&[2,3].includes(stat.gameTypeId)&&/^\d{8}$/.test(String(stat.season))&&label(stat.teamName)).map(stat=>{
  const season=String(stat.season);return {season:season.slice(0,4)+'/'+season.slice(4),competition:stat.leagueAbbrev,competitionId:stat.leagueAbbrev,stage:stat.gameTypeId===2?'Grundserie':'Slutspel',stageCode:stat.gameTypeId===2?'regular':'playoffs',team:label(stat.teamName),teamId:label(stat.teamName),source:'NHL',sourceUrl,...parseNhlStats(stat)};
 });
 const draft=profile.draftDetails;
 return {id,sourceUrl,photo:safeNhlPhoto(profile.headshot,id),history,
  regular:profile.careerTotals?.regularSeason?parseNhlStats(profile.careerTotals.regularSeason):null,
  playoffs:profile.careerTotals?.playoffs?parseNhlStats(profile.careerTotals.playoffs):null,
  draft:draft&&Number.isInteger(draft.year)&&Number.isInteger(draft.overallPick)?{year:draft.year,team:String(draft.teamAbbrev||''),round:statNumber(draft.round),pick:statNumber(draft.overallPick)}:null,
  awards:(profile.awards||[]).filter(award=>label(award.trophy)).map(award=>({name:label(award.trophy),seasons:[...new Set((award.seasons||[]).map(s=>String(s.seasonId)).filter(s=>/^\d{8}$/.test(s)).map(s=>s.slice(0,4)+'/'+s.slice(4)))]}))};
}
export async function nhlExtras(player){
 if(!player.birthdate||!player.name)return null;
 return memo('match:'+normalizeName(player.name)+':'+player.birthdate,async()=>{
  const query=player.name.normalize('NFD').replace(/[\u0300-\u036f]/g,'');
  const results=await memo('search:'+normalizeName(query),()=>json('https://search.d3.nhle.com/api/v1/search/player?'+new URLSearchParams({culture:'en-us',limit:'20',q:query})));
  const ids=[...new Set((Array.isArray(results)?results:[]).filter(p=>normalizeName(p.name)===normalizeName(player.name)&&/^\d{7}$/.test(String(p.playerId))).map(p=>String(p.playerId)))];
  if(!ids.length||ids.length>3)return null;
  const profiles=await Promise.all(ids.map(id=>memo('profile:'+id,()=>json('https://api-web.nhle.com/v1/player/'+id+'/landing'))));
  const matches=profiles.filter(p=>ids.includes(String(p.playerId))&&matchesNhlIdentity(player,p));
  return matches.length===1?parseNhlProfile(matches[0]):null;
 });
}

// Prefer NHL's records for a complete North-American season/league/stage group.
// Other league records stay with the original provider; uncertain aliases are not joined.
export function mergeNhlHistory(primary,secondary){
 const key=row=>JSON.stringify([row.season,row.competition.toUpperCase(),careerStage(row)]);
 const seasonKey=row=>JSON.stringify([row.season,row.competition.toUpperCase()]);
 const replacements=new Set(secondary.map(key)),specified=new Set(secondary.map(seasonKey));
 return [...primary.filter(row=>!replacements.has(key(row))&&!(careerStage(row)==='unknown'&&specified.has(seasonKey(row)))),...secondary].map(row=>leagues.has(row.competition.toUpperCase())?{...row,competition:row.competition.toUpperCase(),competitionId:row.competition.toUpperCase()}:row).sort((a,b)=>b.season.localeCompare(a.season));
}
