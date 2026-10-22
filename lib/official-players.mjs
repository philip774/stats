
import {statNumber} from './numbers.mjs';

const sites={shl:'https://www.shl.se',sdhl:'https://www.sdhl.se',allsvenskan:'https://www.hockeyallsvenskan.se'};
const cache=new Map();
async function memo(key,ttl,load){
 const old=cache.get(key);if(old&&Date.now()-old.time<ttl)return old.promise;
 const promise=load();cache.set(key,{time:Date.now(),promise});
 try{return await promise}catch(error){cache.delete(key);throw error}finally{if(cache.size>100)cache.delete(cache.keys().next().value)}
}
async function remote(url,json=true,deadline){
 const signal=deadline?AbortSignal.any([deadline,AbortSignal.timeout(10000)]):AbortSignal.timeout(10000);
 const response=await fetch(url,{headers:{Accept:json?'application/json':'text/html'},signal});
 if(!response.ok)throw new Error('Official player source unavailable');
 return json?response.json():response.text();
}
export const normalizeName=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'');
export function normalizeTeam(value){
 const name=normalizeName(String(value||'').replace(/\b(?:IF|IK|HC|BK|HK|SK|HF|Hockey|Club|Bollklubb|Bandyklubb|Idrottsförening|Idrottsföreningen|Idrottsklubb)\b/gi,''));
 return name==='djurgardens'?'djurgarden':['luleahockeymssk','luleamssk'].includes(name)?'lulea':name;
}
export function safePhoto(media){
 const candidates=(media?.srcset||'').replace(/\\n/g,' ').split(',').map(part=>part.trim()).filter(part=>/ (?:160|320)w$/.test(part));
 const value=candidates[0]?.replace(/\s+\d+w$/,'')||media?.url;
 try{const url=new URL(value);return url.protocol==='https:'&&['s8y-cdn-sp-photos.imgix.net','sportality.cdn.s8y.se','ha-media.hadigital.se'].includes(url.hostname)&&!/(?:default-|silh?ou?ette|silhoutte)/i.test(url.pathname)?url.href:null}catch{return null}
}
export function matchOfficialPlayer(player,directory){
 const candidates=directory.filter(item=>normalizeName(item.name)===normalizeName(player.name)&&(item.teamAliases||[item.team]).some(team=>normalizeTeam(team)===normalizeTeam(player.team))&&(!item.birthdate||!player.birthdate||item.birthdate===player.birthdate));
 return candidates.length===1?candidates[0]:null;
}
function initialPlayers(html){
 const flight=[...html.matchAll(/self\.__next_f\.push\((\[[\s\S]*?)\)<\/script>/g)].flatMap(match=>{try{const data=JSON.parse(match[1]);return data[0]===1&&typeof data[1]==='string'?[data[1]]:[]}catch{return []}}).join('');
 const marker=flight.indexOf('"initialPlayers":');if(marker<0)return [];
 const start=flight.indexOf('[',marker);let depth=0,quoted=false,escaped=false;
 for(let i=start;i<flight.length;i++){const ch=flight[i];if(quoted){if(escaped)escaped=false;else if(ch==='\\')escaped=true;else if(ch==='"')quoted=false}else if(ch==='"')quoted=true;else if(ch==='['||ch==='{')depth++;else if(ch===']'||ch==='}'){if(--depth===0)return JSON.parse(flight.slice(start,i+1))}}
 return [];
}
export async function officialDirectory(league){
 if(!sites[league])return [];
 return memo('directory:'+league,3600000,async()=>{
  const base=sites[league],deadline=AbortSignal.timeout(18000);
  if(league==='allsvenskan'){
   const players=initialPlayers(await remote(base+'/pages/alla-spelare',false));
   return players.map(p=>({id:String(p.documentId),name:p.firstName+' '+p.familyName,team:p.team?.name||'',birthdate:p.birthDate,photo:safePhoto({url:p.headshots?.small}),url:base+'/pages/alla-spelare',league}));
  }
  const html=await remote(base+'/alla-lag',false,deadline);
  const ids=[...new Set([...html.matchAll(/href="[^"]*\/team\/([a-zA-Z0-9-]+)\//g)].map(m=>m[1]))];
  if(!ids.length||ids.length>30)throw new Error('Official team directory unavailable');
  const entries=[];let cursor=0;
  await Promise.all(Array.from({length:4},async()=>{while(cursor<ids.length&&!deadline.aborted){const id=ids[cursor++];try{
   const [team,groups]=await Promise.all([remote(base+'/api/sports-v2/teams/'+id,true,deadline),remote(base+'/api/sports-v2/athletes/by-team-uuid/'+id,true,deadline)]);
   if(!Array.isArray(groups))continue;
   for(const group of groups)for(const p of group.players||[])if(p.uuid&&p.fullName)entries.push({id:p.uuid,name:p.fullName,team:team.names?.long||team.names?.full||'',teamAliases:Object.values(team.names||{}),photo:safePhoto(p.renderedLatestPortrait||p.portraitList?.[0]?.renderedMedia),url:base+'/athlete-profile/'+encodeURIComponent(p.uuid)+'/',league});
  }catch{/* A missing club portrait feed never blocks the official stats feed. */}}}));
  return [...new Map(entries.map(entry=>[entry.id+'|'+entry.team,entry])).values()];
 });
}
export async function addOfficialPhotos(players,league){
 try{const directory=await officialDirectory(league);return players.map(player=>{const official=matchOfficialPlayer(player,directory);return official?{...player,photo:official.photo,officialId:official.id,officialUrl:official.url}:player})}catch{return players}
}
const finite=statNumber;
const translated=(names,fallback='')=>Array.isArray(names)?names.find(n=>n.language==='sv')?.translation||names[0]?.translation||fallback:fallback;
export function parseSeasonHistory(blocks){
 const rows=[];
 for(const block of Array.isArray(blocks)?blocks:[])for(const stat of block.stats||[]){
  const meta=block.seasonSeriesGameTypes?.[stat.info?.ssgtUuid];if(!meta)continue;
  const season=translated(meta.season?.names,meta.season?.code);if(!season)continue;
  const didNotPlay=stat.GPI!==undefined&&finite(stat.GPI)===0;
  rows.push({season,competition:translated(meta.series?.names,meta.series?.code),competitionId:meta.series?.uuid||meta.series?.code||'',stage:translated(meta.gameType?.names,meta.gameType?.code),stageCode:meta.gameType?.code||'',team:String(stat.info?.team?.name||stat.info?.teamId||''),teamId:String(stat.info?.team?.uuid||stat.info?.teamId||''),played:finite(stat.GPI??stat.GP),goals:finite(stat.G),assists:finite(stat.A),points:finite(stat.TP),plusMinus:finite(stat.PlusMinus),penaltyMinutes:finite(stat.PIM),savePercentage:didNotPlay?null:finite(stat.SVSPerc??stat.SVSPercent),gaa:didNotPlay?null:finite(stat.GAA),goalsAgainst:finite(stat.GA),saves:finite(stat.SVS),shutouts:finite(stat.SO)});
 }
 return rows.sort((a,b)=>b.season.localeCompare(a.season));
}
export function parsePlayerGameLog(blocks){
 return (Array.isArray(blocks)?blocks:[]).flatMap(block=>(block.stats||[]).filter(s=>/^\d{4}-\d{2}-\d{2}$/.test(s.Date)).map(s=>({date:s.Date,competition:translated(s.Series),home:s.HomeTeam,away:s.GuestTeam,goals:finite(s.G),assists:finite(s.A),points:finite(s.TP),plusMinus:finite(s.PlusMinus),penaltyMinutes:finite(s.PIM),shots:finite(s.SOG),hits:finite(s.HITS),iceTime:typeof s.TOI==='string'&&/^\d+:\d{2}$/.test(s.TOI)?s.TOI:null,played:s.GPI===undefined?null:finite(s.GPI),savePercentage:finite(s.GPI)===0?null:finite(s.SVSPerc??s.SVSPercent),gaa:finite(s.GPI)===0?null:finite(s.GAA),saves:finite(s.GPI)===0?null:finite(s.SVS),goalsAgainst:finite(s.GPI)===0?null:finite(s.GA),shotsAgainst:finite(s.GPI)===0?null:finite(s.SOGA)}))).sort((a,b)=>b.date.localeCompare(a.date));
}
export async function playerExtras(player){
 const directory=await officialDirectory(player.leagueId);const entry=matchOfficialPlayer(player,directory);
 if(!entry)return {photo:null,sourceUrl:null,history:[],games:[],available:false};
 if(player.leagueId==='allsvenskan')return {photo:entry.photo,sourceUrl:entry.url,history:[],games:[],available:true};
 const base=sites[player.leagueId],id=encodeURIComponent(entry.id),instance=player.leagueId==='shl'?'shl1_shl':'sdhl1_sdhl';
 return memo('profile:'+player.leagueId+':'+entry.id+':'+player.birthdate,120000,async()=>{
  const profile=await remote(base+'/api/statistics-v2/athlete/profile-page?playerUuid='+id+'&masterSiteInstanceId='+instance);
  // Check the birthdate before joining another provider's career records.
  if(!player.birthdate||profile.birthDate!==player.birthdate||normalizeName(profile.fullName)!==normalizeName(player.name))return {photo:null,sourceUrl:null,history:[],games:[],available:false};
  const results=await Promise.allSettled([
   remote(base+'/api/statistics-v2/athlete/playerProfile_gameLog?playerUuid='+id+'&masterSiteInstanceId='+instance),
   remote(base+'/api/statistics-v2/athlete/playerProfile_seasonGameLog?playerUuid='+id+'&masterSiteInstanceId='+instance+'&season=2026%2F2027')
  ]);
  return {photo:safePhoto(profile.media)||entry.photo,sourceUrl:entry.url,history:results[0].status==='fulfilled'?parseSeasonHistory(results[0].value):[],games:results[1].status==='fulfilled'?parsePlayerGameLog(results[1].value):[],available:true,partial:results.some(r=>r.status==='rejected')};
 });
}
