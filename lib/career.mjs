const number=value=>typeof value==='number'&&Number.isFinite(value);
const normalized=value=>String(value||'').normalize('NFC').trim().toLocaleLowerCase('sv');
const fields=['played','goals','assists','points','plusMinus','penaltyMinutes','goalsAgainst','saves','shutouts','savePercentage','gaa'];

export function careerStage(row){
 const code=normalized(row.stageCode||row.stage);
 if(['regular','regular season','grundserie'].includes(code))return 'regular';
 if(['playoff','playoffs','slutspel'].includes(code))return 'playoffs';
 return code?'other:'+code:'unknown';
}
export function careerStageLabel(key){
 return key==='regular'?'Grundserie':key==='playoffs'?'Slutspel':key==='unknown'?'Fas ej angiven':key.replace(/^other:/,'');
}
export const careerLeagueKey=row=>row.competitionId||row.competition||'unknown';
const groupKey=row=>JSON.stringify([row.season,careerLeagueKey(row),careerStage(row)]);
const isTotal=row=>/^(?:total|totalt|totals|all teams|alla lag|\d+\s+(?:teams|lag))$/i.test(row.team.trim());
const identity=row=>JSON.stringify([groupKey(row),row.teamId||normalized(row.team)]);

// A season total must not be added to its individual club stints a second time.
export function prepareCareer(history){
 const seen=new Set(),groupsWithClubs=new Set(history.filter(row=>row.team&&!isTotal(row)).map(groupKey));
 const rows=history.filter(row=>{
  if(isTotal(row)&&groupsWithClubs.has(groupKey(row)))return false;
  const key=JSON.stringify([identity(row),...fields.map(field=>row[field]??null)]);
  if(seen.has(key))return false;
  seen.add(key);return true;
 }).sort((a,b)=>b.season.localeCompare(a.season)||a.team.localeCompare(b.team,'sv'));
 const identities=new Set();let conflicting=false;
 for(const row of rows){const key=identity(row);if(identities.has(key))conflicting=true;identities.add(key)}
 return {rows,conflicting};
}

export function careerTotals(history){
 const {rows,conflicting}=prepareCareer(history);
 // Missing figures stay unknown, rather than becoming deceptively low totals.
 const sum=field=>!conflicting&&rows.length>0&&rows.every(row=>number(row[field]))?rows.reduce((n,row)=>n+row[field],0):null;
 const played=sum('played'),points=sum('points'),saves=sum('saves'),goalsAgainst=sum('goalsAgainst');
 return {played,goals:sum('goals'),assists:sum('assists'),points,plusMinus:sum('plusMinus'),penaltyMinutes:sum('penaltyMinutes'),saves,goalsAgainst,shutouts:sum('shutouts'),
  pointsPerGame:points!==null&&played>0?points/played:null,
  savePercentage:saves!==null&&goalsAgainst!==null&&saves+goalsAgainst>0?100*saves/(saves+goalsAgainst):null,
  conflicting};
}

export function careerByLeague(history){
 const groups=new Map();
 for(const row of prepareCareer(history).rows){
  const key=JSON.stringify([careerLeagueKey(row),careerStage(row)]);
  if(!groups.has(key))groups.set(key,{key,competition:row.competition||'Liga ej angiven',stage:careerStageLabel(careerStage(row)),rows:[]});
  groups.get(key).rows.push(row);
 }
 return [...groups.values()].map(group=>({...group,totals:careerTotals(group.rows)})).sort((a,b)=>a.competition.localeCompare(b.competition,'sv')||a.stage.localeCompare(b.stage,'sv'));
}

// Clubs within the same season have no reliable transfer order or transfer date.
export function careerClubs(history){
 const seasons=new Map();
 for(const row of prepareCareer(history).rows){
  if(!row.team||isTotal(row))continue;
  if(!seasons.has(row.season))seasons.set(row.season,new Map());
  const clubs=seasons.get(row.season),key=row.teamId||normalized(row.team);
  if(!clubs.has(key))clubs.set(key,{team:row.team,competitions:new Set()});
  if(row.competition)clubs.get(key).competitions.add(row.competition);
 }
 return [...seasons].map(([season,clubs])=>({season,clubs:[...clubs.values()].map(club=>({team:club.team,competitions:[...club.competitions].sort()})).sort((a,b)=>a.team.localeCompare(b.team,'sv'))})).sort((a,b)=>b.season.localeCompare(a.season));
}
