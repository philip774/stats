import test from 'node:test';
import assert from 'node:assert/strict';
import {matchesNhlIdentity,parseNhlProfile,parseNhlStats,mergeNhlHistory,nhlExtras,safeNhlPhoto} from '../lib/nhl-players.mjs';
import {parseLineups} from '../lib/lineups.mjs';
import {careerTotals} from '../lib/career.mjs';

const person={name:'Felix Sandström',birthdate:'1997-01-12'};
const profile={playerId:8478433,firstName:{default:'Felix'},lastName:{default:'Sandstrom'},birthDate:'1997-01-12'};
test('NHL joins require both a matching name and birthdate; photos stay on the official host and player ID',()=>{
 assert.equal(matchesNhlIdentity(person,profile),true);assert.equal(matchesNhlIdentity({...person,birthdate:null},profile),false);
 assert.equal(matchesNhlIdentity(person,{...profile,birthDate:'1998-01-12'}),false);assert.equal(matchesNhlIdentity({...person,name:'Another Sandström'},profile),false);
 assert.equal(safeNhlPhoto('https://assets.nhle.com/mugs/nhl/latest/8478433.png',8478433),'https://assets.nhle.com/mugs/nhl/latest/8478433.png');
 assert.equal(safeNhlPhoto('https://assets.nhle.com/mugs/nhl/latest/1234567.png',8478433),null);assert.equal(safeNhlPhoto('https://example.com/mugs/nhl/latest/8478433.png',8478433),null);
});

test('NHL career import keeps supported North-American leagues and known phases; fractions become percentages',()=>{
 const season={season:20222023,gameTypeId:2,gamesPlayed:73,goals:6,assists:9,points:15,shootingPctg:.08,teamName:{default:'San Jose Sharks'},leagueAbbrev:'NHL'};
 const result=parseNhlProfile({...profile,seasonTotals:[season,{...season,leagueAbbrev:'AHL'},{...season,leagueAbbrev:'Sweden'},{...season,gameTypeId:1}],careerTotals:{regularSeason:season},draftDetails:{year:2014,teamAbbrev:'PHI',round:5,overallPick:138},awards:[{trophy:{default:'Test trophy'},seasons:[{seasonId:20202021}]}]});
 assert.equal(result.history.length,2);assert.equal(result.history[0].season,'2022/2023');assert.equal(result.history[0].shootingPercentage,8);assert.equal(result.regular.played,73);assert.equal(result.draft.pick,138);assert.deepEqual(result.awards[0].seasons,['2020/2021']);
});

test('goalie NHL percentages, saves, missing values and zero appearances remain distinct',()=>{
 const stats=parseNhlStats({gamesPlayed:30,shotsAgainst:848,goalsAgainst:102,savePctg:.879717,goalsAgainstAvg:3.656822,shutouts:0});
 assert.equal(stats.saves,746);assert.ok(Math.abs(stats.savePercentage-87.9717)<1e-9);assert.equal(stats.shutouts,0);assert.equal(stats.wins,null);
 const none=parseNhlStats({gamesPlayed:0,savePctg:0,goalsAgainstAvg:0});assert.equal(none.savePercentage,null);assert.equal(none.gaa,null);assert.equal(parseNhlStats({savePctg:88}).savePercentage,null);
});

test('new NHL history replaces overlapping or unspecified phase records instead of doubling career totals',()=>{
 const base={season:'2021/2022',competition:'AHL',competitionId:'old-uuid',stage:'',stageCode:'',team:'A',teamId:'A',played:20,goals:2,assists:8,points:10};
 const nhl=[{...base,competitionId:'AHL',stage:'Grundserie',stageCode:'regular'},{...base,competitionId:'AHL',stage:'Slutspel',stageCode:'playoffs',played:3,points:1}];
 const merged=mergeNhlHistory([base,{...base,competition:'SHL',competitionId:'shl'}],nhl);
 assert.equal(merged.length,3);assert.equal(merged.filter(r=>r.competition==='AHL').length,2);assert.equal(careerTotals(merged.filter(r=>r.competition==='AHL')).played,23);
 const known=mergeNhlHistory([{...base,stage:'Grundserie',stageCode:'regular',team:'Different spelling',played:40}],nhl);assert.equal(careerTotals(known).played,23);
});

test('ambiguous NHL identities never attach a namesake career',async t=>{
 const p={name:'Unique Testname',birthdate:'1990-01-01'},matches=['9000001','9000002'].map(playerId=>({name:p.name,playerId}));
 t.mock.method(globalThis,'fetch',async url=>({ok:true,json:async()=>String(url).includes('search.d3')?matches:{playerId:String(url).match(/player\/(\d+)/)[1],firstName:{default:'Unique'},lastName:{default:'Testname'},birthDate:p.birthdate}}));
 assert.equal(await nhlExtras(p),null);
});

const unit=(label,players)=>'<tr><th><strong>'+label+'</strong></th><td>'+players.map(p=>'<div class="lineUpPlayer red">'+p+'</div>').join('')+'</td></tr>';
const report='<h2>Home HC - Away HC</h2><td class="tdInfoArea">2 - 1 Final Score</td><p>Last update: 2026-10-22 21:10:00</p>'+
 '<tr><td><strong>Referee(s)</strong></td><td>Ref A, Ref B</td></tr><tr><td><strong>Linesmen</strong></td><td>Line A</td></tr>'+
 '<h3>Home HC (Blue)</h3><tr><td><strong>Head Coach:</strong> Coach, Home</td></tr>'+unit('Goalies',['30. Keeper, Home'])+unit('1st Line',['9. Forward, Home'])+
 '<h3>Away HC (White)</h3>'+unit('4th Line',['10. Forward, Away'])+unit('Goalies',['35. Keeper, Away'])+unit('Extra Players',['22. Extra, Away (RW)']);
test('lineups read each team independently, sort reversed away units, and do not infer starting players from colour',()=>{
 const data=parseLineups(report);assert.equal(data.teams.length,2);assert.equal(data.teams[0].units[0].players[0].name,'Home Keeper');
 assert.equal(data.teams[1].units[0].label,'Målvakter');assert.equal(data.teams[1].units[2].players[0].position,'RW');assert.equal(data.teams[1].units[0].players[0].starter,undefined);
 assert.equal(data.teams[0].coaches[0].name,'Home Coach');assert.equal(data.referees,'Ref A, Ref B');assert.equal(data.linesmen,'Line A');
 assert.throws(()=>parseLineups(report.replace('<h3>Away HC (White)</h3>','<h3>Another HC</h3>')));
});
