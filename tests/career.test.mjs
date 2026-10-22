import test from 'node:test';
import assert from 'node:assert/strict';
import {careerByLeague,careerClubs,careerStage,careerTotals,prepareCareer} from '../lib/career.mjs';
import {parseSeasonHistory} from '../lib/official-players.mjs';

const season=(overrides={})=>({season:'2025/2026',competition:'SHL',competitionId:'shl',stage:'Grundserie',stageCode:'regular',team:'Test HC',teamId:'test',played:10,goals:2,assists:3,points:5,plusMinus:1,penaltyMinutes:4,saves:null,goalsAgainst:null,savePercentage:null,gaa:null,shutouts:null,...overrides});

test('career totals avoid adding duplicate records or all-team totals to club stints',()=>{
 const a=season(),b=season({team:'Other HC',teamId:'other',played:5,goals:1,assists:2,points:3});
 const total=season({team:'Total',teamId:'total',played:15,goals:3,assists:5,points:8});
 const result=careerTotals([a,{...a},b,total]);
 assert.equal(result.played,15);assert.equal(result.points,8);assert.equal(result.goals,3);assert.equal(result.conflicting,false);assert.equal(prepareCareer([a,a,b,total]).rows.length,2);
});

test('missing stats and conflicting duplicate rows never produce misleading career totals',()=>{
 const a=season(),b=season({season:'2024/2025',goals:null,points:null});
 const partial=careerTotals([a,b]);assert.equal(partial.goals,null);assert.equal(partial.points,null);assert.equal(partial.played,20);assert.equal(partial.assists,6);
 const conflict=careerTotals([a,{...a,points:6}]);assert.equal(conflict.conflicting,true);assert.equal(conflict.played,null);assert.equal(conflict.points,null);
 assert.equal(careerTotals([]).played,null);assert.equal(careerTotals([season({points:0,goals:0,assists:0})]).points,0);
});

test('playoffs, regular season and unknown foreign-league stages stay separate',()=>{
 const rows=[season(),season({stage:'Playoffs',stageCode:'playoffs',played:3}),season({competition:'AHL',competitionId:'ahl',stage:'',stageCode:'',played:12}),season({stage:'Slutspel',stageCode:'playoff',season:'2024/2025',played:2})];
 const groups=careerByLeague(rows);assert.equal(groups.length,3);
 assert.equal(groups.find(g=>g.competition==='AHL').stage,'Fas ej angiven');
 assert.equal(groups.find(g=>g.stage==='Slutspel').totals.played,5);assert.equal(careerStage(rows[2]),'unknown');
});

test('goalie save percentage is weighted by saves and goals, never an average of percentages',()=>{
 const rows=[season({saves:9,goalsAgainst:1,savePercentage:90,shutouts:0}),season({season:'2024/2025',saves:99,goalsAgainst:1,savePercentage:99,shutouts:1})];
 const totals=careerTotals(rows);assert.equal(totals.saves,108);assert.equal(totals.goalsAgainst,2);assert.equal(totals.savePercentage,100*108/110);assert.notEqual(totals.savePercentage,94.5);assert.equal(totals.shutouts,1);
 assert.equal(careerTotals([rows[0],season({saves:null,goalsAgainst:1})]).savePercentage,null);
 assert.equal(careerTotals([season({saves:0,goalsAgainst:0})]).savePercentage,null);
});

test('club history groups simultaneous clubs by season without inventing transfers or dates',()=>{
 const rows=[season(),season({stage:'Slutspel',stageCode:'playoff'}),season({team:'Abroad HC',teamId:'abroad',competition:'AHL'}),season({season:'2024/2025'})];
 const clubs=careerClubs(rows);assert.equal(clubs.length,2);assert.equal(clubs[0].season,'2025/2026');assert.equal(clubs[0].clubs.length,2);assert.deepEqual(clubs[0].clubs.map(c=>c.team),['Abroad HC','Test HC']);assert.equal(clubs[0].clubs[1].competitions.length,1);assert.equal(clubs[0].date,undefined);
});

test('official history retains international league identities and does not assume a missing stage is regular',()=>{
 const [row]=parseSeasonHistory([{seasonSeriesGameTypes:{a:{season:{code:'2021/2022'},series:{uuid:'ahl',code:'AHL'},gameType:{code:''}}},stats:[{GP:43,G:9,A:24,TP:33,info:{ssgtUuid:'a',team:{name:'San Diego Gulls',uuid:'sd'}}}]}]);
 assert.equal(row.competition,'AHL');assert.equal(row.competitionId,'ahl');assert.equal(row.teamId,'sd');assert.equal(row.stageCode,'');assert.equal(careerStage(row),'unknown');assert.equal(row.points,33);
});

test('goalie seasons with no appearances retain zero games but no misleading performance rates',()=>{
 const [row]=parseSeasonHistory([{seasonSeriesGameTypes:{a:{season:{code:'2021'},series:{code:'HA'},gameType:{code:'regular'}}},stats:[{GP:12,GPI:0,SVSPerc:0,GAA:0,GA:0,SVS:0,info:{ssgtUuid:'a',team:{name:'Test HC'}}}]}]);
 assert.equal(row.played,0);assert.equal(row.savePercentage,null);assert.equal(row.gaa,null);assert.equal(row.saves,0);
});
