import test from 'node:test';
import assert from 'node:assert/strict';
import {parseStandings,teamSummary,headToHead} from '../lib/statistics.mjs';
import {parseEvents} from '../lib/hockey.mjs';
const row=c=>'<tr>'+c.map(v=>'<td>'+v+'</td>').join('')+'</tr>';
const standing=(team,points)=>row(['1',team,'5','3','2','0','22:10 (12)','12',points,'1','0','0','1']);
test('standings preserve official rank, points and separate home/away tables',()=>{
  const html='<h2>Standings</h2>'+standing('Falu IF','12')+standing('Valbo HC','12')+'<h2>Home</h2>'+standing('Falu IF','6')+'<h2>Away</h2>'+standing('Valbo HC','9')+'<h2>Last 5 games</h2>'+standing('Ignored HC','99');
  const data=parseStandings(html);
  assert.equal(data.total.length,2);assert.equal(data.total[1].rank,1);assert.equal(data.total[0].goalsFor,22);assert.equal(data.total[0].wins,4);assert.equal(data.total[0].losses,1);assert.equal(data.home[0].points,6);assert.equal(data.away[0].points,9);assert.throws(()=>parseStandings('<html>Unavailable</html>'));
});
const game=(date,home,away,a,b,status='finished')=>({id:date,groupId:'21088',date,time:'19:00',home,away,homeScore:a,awayScore:b,status});
test('form uses the team perspective and ignores live, missing and future scores',()=>{
  const games=[game('2026-10-01','A','B',3,1),game('2026-10-02','B','A',4,1),game('2026-10-03','A','B',2,0,'live'),game('2026-10-04','A','C',null,null,'scheduled'),game('2026-10-10','A','B',4,0)];
  const data=teamSummary(games,'A','2026-10-05');assert.equal(data.played,2);assert.equal(data.wins,1);assert.equal(data.goalsFor,4);assert.equal(data.goalsAgainst,5);assert.deepEqual(data.form.map(g=>g.result),['L','W']);
  const meetings=headToHead(games,'A','B','2026-10-05');assert.equal(meetings.length,2);assert.equal(meetings[0].date,'2026-10-02');
});
test('match metrics keep zero values, decimal percentages and missing stats distinct',()=>{
  const html='<h2>A - B</h2><td class="tdInfoArea">2 - 1 Final Score Spectators: 123</td>'+row(['Shots','<strong>20</strong>','Shots','<strong>18</strong>'])+row(['PIM','<strong>0</strong>','PIM','<strong>2</strong>'])+row(['PP','<strong>0,00%</strong>','PP','<strong>25,50%</strong>']);
  const data=parseEvents(html);assert.deepEqual(data.metrics.shots,[20,18]);assert.deepEqual(data.metrics.penaltyMinutes,[0,2]);assert.deepEqual(data.metrics.powerPlay,[0,25.5]);assert.equal(data.metrics.saves,null);assert.equal(data.attendance,'123');
});
