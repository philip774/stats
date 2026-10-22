import test from 'node:test';
import assert from 'node:assert/strict';
import {parseTeamPlayers,playerAge} from '../lib/players.mjs';
import {parseTeamStats} from '../lib/team-stats.mjs';
import {parseEvents,updateGameStatuses} from '../lib/hockey.mjs';
import {statNumber} from '../lib/numbers.mjs';
import {matchOfficialPlayer,safePhoto,parseSeasonHistory,parsePlayerGameLog} from '../lib/official-players.mjs';
const row=c=>'<tr>'+c.map(v=>'<td>'+v+'</td>').join('')+'</tr>';
const header=c=>'<tr>'+c.map(v=>'<th>'+v+'</th>').join('')+'</tr>';

test('tied player ranks and missing statistics retain real values instead of dropping players',()=>{
 const html='<tr><th class="tdTitle">Test HC</th></tr><tr><th>Playing Statistics</th></tr>'+header(['Rk','No','Name','Pos','GP','TP','A','G','PIM','PPG','GWG','SHG'])+row(['','9','Test, Joel','LW','5','N/A','3','0','0','','0','0']);
 const [player]=parseTeamPlayers(html);assert.equal(player.name,'Joel Test');assert.equal(player.skater.played,5);assert.equal(player.skater.points,null);assert.equal(player.skater.goals,0);assert.equal(player.skater.assists,3);assert.equal(player.skater.penaltyMinutes,0);assert.equal(player.skater.powerPlayGoals,null);
});
test('tied penalty-killing ranks preserve the team and interpret PP and PK columns separately',()=>{
 const names=['Rk','Team','GP','DVG.','PPGA','PK%','TSH','M:S','SHGF'];
 const data=parseTeamStats(header(names)+row(['','<span title="Växjö Lakers HC">VÄX</span>','10','22','6','72.73','35:37','05:56','1']),'PowerplayAndPenaltyKilling');
 assert.equal(data.teams[0].team,'Växjö Lakers HC');assert.equal(data.teams[0].penaltyKillPercentage,72.73);assert.equal(data.teams[0].timesShortHanded,22);assert.equal(data.teams[0].shortHandedGoals,1);assert.equal(data.teams[0].powerPlayPercentage,undefined);
});
test('team averages retain the official per-60-minute figure rather than substituting per-game math',()=>{
 const result=parseTeamStats(header(['Rk','Team','GP','GF','SSG','SOG','GFA','SG%'])+row(['1','FRÖ','11','38','239','277','3.40','13.72']),'ScoringAndGoalkeeping');
 assert.equal(result.teams[0].goalsForPer60,3.4);assert.notEqual(result.teams[0].goalsForPer60,38/11);assert.equal(result.teams[0].shotsFor,277);
});
test('official portraits require a unique matching player and club, with birthdate checks when available',()=>{
 const player={name:'Lucas Elvenes',team:'Växjö Lakers HC',birthdate:'1999-08-18'};
 const entry={id:'a',name:'Lucas Elvenes',team:'Växjö Lakers',birthdate:'1999-08-18'};
 assert.equal(matchOfficialPlayer(player,[entry])?.id,'a');assert.equal(matchOfficialPlayer(player,[{...entry,birthdate:'1998-08-18'}]),null);assert.equal(matchOfficialPlayer(player,[{...entry,team:'Annat HC'}]),null);assert.equal(matchOfficialPlayer(player,[entry,{...entry,id:'b'}]),null);
 assert.equal(safePhoto({url:'https://attacker.example/portrait.png'}),null);assert.equal(safePhoto({url:'https://sportality.cdn.s8y.se/default-images/player/default.png'}),null);assert.equal(safePhoto({url:'https://ha-media.hadigital.se/real-player.webp'}),'https://ha-media.hadigital.se/real-player.webp');
});
test('goalkeeper season history uses actual appearances and keeps regular season and playoffs separate',()=>{
 const meta=stage=>({season:{names:[{language:'sv',translation:'2026/2027'}]},series:{code:'SHL'},gameType:{code:stage}});
 const [history]=parseSeasonHistory([{seasonSeriesGameTypes:{regular:meta('Grundserie'),playoffs:meta('Slutspel')},stats:[{GP:10,GPI:5,SVSPerc:'97.66',GAA:'0.59',GA:3,SVS:125,SO:2,info:{ssgtUuid:'regular',team:{name:'Färjestad BK'}}}]}]);
 assert.equal(history.played,5);assert.equal(history.savePercentage,97.66);assert.equal(history.gaa,.59);assert.equal(history.stage,'Grundserie');assert.equal(history.saves,125);
});
test('a goalie who did not play is never shown with a misleading zero save percentage',()=>{
 const log=parsePlayerGameLog([{stats:[{Date:'2026-10-20',HomeTeam:'A',GuestTeam:'B',GPI:0,SVSPerc:0,GAA:0},{Date:'2026-10-21',HomeTeam:'B',GuestTeam:'A',GPI:1,SVSPerc:100,GAA:0,SVS:20,SOGA:20,GA:0}]}]);
 assert.equal(log[0].savePercentage,100);assert.equal(log[0].gaa,0);assert.equal(log[1].played,0);assert.equal(log[1].savePercentage,null);assert.equal(log[1].gaa,null);
});
test('deciding shootout goals without a timestamp remain visible in match events',()=>{
 const detail=parseEvents('<h2>A - B</h2><td class="tdInfoArea">2 - 3 Final Score</td>'+row(['','2-3 (GWS)','B','81. Test, Johan']));
 assert.equal(detail.events[0].type,'2-3 (GWS)');assert.equal(detail.events[0].time,'Straffar');assert.equal(detail.status,'finished');
});
test('confirmed final scores today enter team form; conflicting match identities do not',async()=>{
 const games=[{date:'2026-10-22',eventId:'123456',home:'A',away:'B',homeScore:2,awayScore:1,status:'reported'}];
 const partial=await updateGameStatuses(games,'2026-10-22',async()=>'<h2>A - B</h2><td class="tdInfoArea">2 - 1 Final Score</td>');assert.equal(partial,false);assert.equal(games[0].status,'finished');
 games[0].status='reported';const mismatch=await updateGameStatuses(games,'2026-10-22',async()=>'<h2>C - D</h2><td class="tdInfoArea">2 - 1 Final Score</td>');assert.equal(mismatch,true);assert.equal(games[0].status,'reported');
});
test('absent numbers, explicit zeroes, decimals and invalid birthdates stay distinct',()=>{
 assert.equal(statNumber(null),null);assert.equal(statNumber(undefined),null);assert.equal(statNumber('N/A'),null);assert.equal(statNumber('–'),null);assert.equal(statNumber(''),null);assert.equal(statNumber('0'),0);assert.equal(statNumber('97,66'),97.66);assert.equal(statNumber('-12'),-12);assert.equal(playerAge('2001-02-31','2026-10-22'),null);
});
