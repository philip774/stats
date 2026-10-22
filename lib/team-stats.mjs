import {cells,text,source} from './hockey.mjs';
import {statNumber} from './numbers.mjs';

export const TEAM_STAT_PAGES=['ScoringAndGoalkeeping','PowerplayAndPenaltyKilling','FairPlay','Attendance','Faceoffs'];
export function parseTeamStats(html,page){
 let headers=[];const teams=new Map();
 for(const row of html.match(/<tr\b[^>]*>[\s\S]*?<\/tr>/gi)||[]){
  const titles=[...row.matchAll(/<th\b[^>]*>([\s\S]*?)<\/th>/gi)].map(m=>text(m[1]));
  if(titles[0]==='Rk'&&titles[1]==='Team')headers=titles;
  const c=cells(row);if(!/^\d*$/.test(c[0]??'invalid')||!c[1]||c.length<6||!headers.length||statNumber(c[2])===null)continue;
  const raw=[...row.matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/gi)][1]?.[1]||'';
  const team=text(raw.match(/<span[^>]*title="([^"]+)"/i)?.[1]||c[1]);
  const item=teams.get(team)||{team};
  const value=key=>statNumber(c[headers.indexOf(key)]);
  if(page==='ScoringAndGoalkeeping'&&headers.includes('GF'))Object.assign(item,{played:value('GP'),goalsFor:value('GF'),shotsFor:value('SOG'),shootingPercentage:value('SG%'),goalsForPer60:value('GFA')});
  else if(page==='ScoringAndGoalkeeping'&&headers.includes('GA'))Object.assign(item,{goalsAgainst:value('GA'),saves:value('SVS'),shotsAgainst:value('SOG'),savePercentage:value('SVS%'),goalsAgainstPer60:value('GAA'),shutouts:value('SO'),emptyNetGoalsAgainst:value('ENG')});
  else if(page==='PowerplayAndPenaltyKilling'&&headers.includes('PP%'))Object.assign(item,{powerPlayPercentage:value('PP%'),powerPlayOpportunities:value('ADV.'),powerPlayGoals:value('PPGF'),shortHandedGoalsAgainst:value('SHGA')});
  else if(page==='PowerplayAndPenaltyKilling'&&headers.includes('PK%'))Object.assign(item,{penaltyKillPercentage:value('PK%'),timesShortHanded:value('DVG.'),powerPlayGoalsAgainst:value('PPGA'),shortHandedGoals:value('SHGF')});
  else if(page==='FairPlay')Object.assign(item,{penaltyMinutes:value('PIM'),penaltyMinutesPerGame:value('PAVG.'),minorPenalties:value('P2'),majorPenalties:value('P5'),misconducts:value('P10'),gameMisconducts:value('GM'),matchPenalties:value('MP')});
  else if(page==='Attendance'&&c.length===13)Object.assign(item,{homeGames:statNumber(c[2]),homeAttendance:statNumber(c[3]),homeAttendanceAverage:statNumber(c[4]),awayAttendanceAverage:statNumber(c[8]),attendanceAverage:statNumber(c[12])});
  else if(page==='Faceoffs'&&c.length===12)Object.assign(item,{faceoffsWon:statNumber(c[3]),faceoffsLost:statNumber(c[4]),faceoffPercentage:statNumber(c[5]),homeFaceoffPercentage:statNumber(c[8]),awayFaceoffPercentage:statNumber(c[11])});
  if(Object.keys(item).length>1)teams.set(team,item);
 }
 if(!teams.size)throw new Error('Team statistics not published or format unrecognized');
 return {teams:[...teams.values()],sourceUpdated:text(html).match(/Last update:\s*(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2})/)?.[1]||null};
}
export async function teamStats(group){
 const results=await Promise.allSettled(TEAM_STAT_PAGES.map(async page=>({page,...parseTeamStats(await source('/Teams/Statistics/'+page+'/'+group.id,120000),page)})));
 const teams=new Map(),sources=[];
 for(const result of results)if(result.status==='fulfilled'){
  const data=result.value;sources.push({name:data.page,url:'https://stats.swehockey.se/Teams/Statistics/'+data.page+'/'+group.id,sourceUpdated:data.sourceUpdated});
  for(const team of data.teams)teams.set(team.team,{...teams.get(team.team),...team});
 }
 if(!teams.size)throw new Error('Ingen utökad lagstatistik är publicerad för serien.');
 return {teams:[...teams.values()],sources,partial:results.some(r=>r.status==='rejected')};
}
