import {cells} from './hockey.mjs';

export function parseStandings(html) {
  const result={total:[],home:[],away:[]};
  for(const [key,title] of [['total','Standings'],['home','Home'],['away','Away']]) {
    const section=html.split(new RegExp('<h2>\\s*'+title+'\\s*<\\/h2>','i'))[1]?.split(/<h2>/i)[0];
    if(!section)continue;
    for(const row of section.match(/<tr\b[^>]*>[\s\S]*?<\/tr>/gi)||[]) {
      const c=cells(row);
      if(c.length!==13||!/^\d+$/.test(c[0])||!c[1])continue;
      const goals=c[6].match(/^(\d+)\s*:\s*(\d+)/);
      const n=[c[0],...c.slice(2,6),c[7],c[8],...c.slice(9)].map(Number);
      if(!goals||n.some(value=>!Number.isFinite(value)))continue;
      result[key].push({rank:+c[0],team:c[1],played:+c[2],regulationWins:+c[3],tied:+c[4],regulationLosses:+c[5],overtimeWins:+c[9],overtimeLosses:+c[10],shootoutWins:+c[11],shootoutLosses:+c[12],goalsFor:+goals[1],goalsAgainst:+goals[2],difference:+c[7],points:+c[8],wins:+c[3]+ +c[9]+ +c[11],losses:+c[5]+ +c[10]+ +c[12]});
    }
  }
  if(!result.total.length)throw new Error('Standings format not recognized');
  return result;
}

export function teamSummary(games,team,before='9999-12-31') {
  const fixtures=games.filter(g=>(g.home===team||g.away===team)&&g.date<before);
  const completed=fixtures.filter(g=>g.status==='finished'&&g.homeScore!==null&&g.awayScore!==null).sort((a,b)=>b.date.localeCompare(a.date)||b.time.localeCompare(a.time));
  const scored=g=>g.home===team?g.homeScore:g.awayScore;
  const conceded=g=>g.home===team?g.awayScore:g.homeScore;
  const form=completed.slice(0,5).map(g=>({game:g,result:scored(g)>conceded(g)?'W':scored(g)<conceded(g)?'L':'D'}));
  return {played:completed.length,wins:completed.filter(g=>scored(g)>conceded(g)).length,goalsFor:completed.reduce((n,g)=>n+scored(g),0),goalsAgainst:completed.reduce((n,g)=>n+conceded(g),0),form};
}

export function headToHead(games,home,away,before) {
  return games.filter(g=>g.status==='finished'&&g.date<before&&((g.home===home&&g.away===away)||(g.home===away&&g.away===home))).sort((a,b)=>b.date.localeCompare(a.date)).slice(0,5);
}
