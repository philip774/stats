import {cells,text} from './hockey.mjs';
import {statNumber as number} from './numbers.mjs';

const sourceKey=(team,name)=>JSON.stringify([team.trim(),name.trim()]);
export const playerKey=player=>JSON.stringify([player.groupId,player.team,player.sourceName]);
export const displayName=name=>name.includes(',')?name.split(',').slice(1).join(',').trim()+' '+name.split(',')[0].trim():name;

function teamTitle(row,current){
 const title=row.match(/<th\b[^>]*class="[^"]*\btdTitle\b[^"]*"[^>]*>([^<]+)<\/th>/i);
 return title&&text(title[1])?text(title[1]):current;
}
export function parseRoster(html){
 let team='';const players=[];
 for(const row of html.match(/<tr\b[^>]*>[\s\S]*?<\/tr>/gi)||[]){
  team=teamTitle(row,team);const c=cells(row);
  if(c.length===8&&c[5].trim()===''&&/colspan="2"/i.test(row))c.splice(5,1,'','');
  if(!team||c.length!==9||!c[1]||!/^\d{4}-\d{2}-\d{2}$/.test(c[2]))continue;
  players.push({sourceName:c[1],name:displayName(c[1]),team,jersey:c[0]||null,birthdate:c[2],position:c[3]||null,shoots:c[4]||null,height:number(c[5]),weight:number(c[6]),nationality:c[7]||null,youthClub:c[8]||null,skater:null,goalie:null});
 }
 if(!players.length)throw new Error('Roster format not recognized');
 return players;
}
export function parseTeamPlayers(html){
 let team='',mode='',headers=[];const players=[];
 for(const row of html.match(/<tr\b[^>]*>[\s\S]*?<\/tr>/gi)||[]){
  team=teamTitle(row,team);
  if(/Playing Statistics/.test(row)){mode='skater';headers=[]}
  if(/Goalkeeping Statistics/.test(row)){mode='goalie';headers=[]}
  const titles=[...row.matchAll(/<th\b[^>]*>([\s\S]*?)<\/th>/gi)].map(m=>text(m[1]));
  if(titles[0]==='Rk'&&titles.includes('Name'))headers=titles;
  const c=cells(row);if(!team||!/^\d*$/.test(c[0]??'invalid')||!c[2])continue;
  if(mode==='skater'&&/^[A-Z]{1,3}$/.test(c[3])){
   const columns=headers.length===c.length?headers:c.length===12?['Rk','No','Name','Pos','GP','G','A','TP','PIM','GWG','PPG','SHG']:c.length===21?['Rk','No','Name','Pos','GP','G','A','TP','PIM','+','-','+/-','GWG','PPG','SHG','SOG','SG%','FO+','FO-','FO','FO%']:[];
   if(!columns.length)continue;const get=key=>number(c[columns.indexOf(key)]);
   const fields={played:'GP',goals:'G',assists:'A',points:'TP',penaltyMinutes:'PIM',gameWinningGoals:'GWG',powerPlayGoals:'PPG',shortHandedGoals:'SHG',plus:'+',minus:'-',plusMinus:'+/-',shots:'SOG',shootingPercentage:'SG%',faceoffsWon:'FO+',faceoffsLost:'FO-',faceoffs:'FO',faceoffPercentage:'FO%'};
   const skater=Object.fromEntries(Object.entries(fields).map(([key,column])=>[key,get(column)]));
   if(skater.played===null)continue;
   players.push({sourceName:c[2],name:displayName(c[2]),team,jersey:c[1]||null,position:c[3],skater,goalie:null});
  }
  if(mode==='goalie'&&c.length===15&&/^\d+:\d{2}$/.test(c[6])){
   const values=[c[5],c[7],c[8],c[9],c[10],c[11],c[12],c[13],c[14]].map(number);
   players.push({sourceName:c[2],name:displayName(c[2]),team,jersey:c[1]||null,position:'GK',skater:null,goalie:{teamGames:number(c[3]),dressed:number(c[4]),played:values[0],minutes:c[6],goalsAgainst:values[1],saves:values[2],shotsAgainst:values[3],savePercentage:values[4],goalsAgainstAverage:values[5],shutouts:values[6],wins:values[7],losses:values[8]}});
  }
 }
 if(!players.length)throw new Error('Player statistics format not recognized');
 return players;
}
export function mergePlayers(roster,statistics,group){
 const map=new Map(roster.map(player=>[sourceKey(player.team,player.sourceName),player]));
 for(const player of statistics){const key=sourceKey(player.team,player.sourceName),old=map.get(key);map.set(key,old?{...old,skater:player.skater||old.skater,goalie:player.goalie||old.goalie}:{birthdate:null,shoots:null,height:null,weight:null,nationality:null,youthClub:null,...player});}
 return [...map.values()].map(player=>({...player,groupId:group.id,group:group.name,leagueId:group.leagueId,league:group.league}));
}
export function readFavoritePlayers(raw){
 try{const value=JSON.parse(raw||'[]');return Array.isArray(value)?[...new Map(value.filter(p=>p&&['sourceName','name','team','groupId','leagueId'].every(key=>typeof p[key]==='string')).map(p=>[playerKey(p),p])).values()]:[]}catch{return []}
}
export function playerAge(birthdate,today){
 if(!/^\d{4}-\d{2}-\d{2}$/.test(birthdate||''))return null;
 if(Number.isNaN(Date.parse(birthdate))||new Date(birthdate).toISOString().slice(0,10)!==birthdate)return null;
 let age=Number(today.slice(0,4))-Number(birthdate.slice(0,4));if(today.slice(5)<birthdate.slice(5))age--;
 return age>=0&&age<100?age:null;
}
