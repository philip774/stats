import assert from 'node:assert/strict';
import test from 'node:test';
import {parseMatchClock} from '../lib/match-clock.mjs';
import {parseEvents,applyGameReport,updateGameStatuses} from '../lib/hockey.mjs';
import {matchStatus} from '../lib/match-status.mjs';

const now=Date.parse('2026-10-23T18:00:00Z');
const fixture={home:'A',away:'B',date:'2026-10-23',time:'19:00',status:'live',homeScore:2,awayScore:1};
const report=(scoreboard,stamp='2026-10-23 20:00:00')=>parseEvents(`<h2>A - B</h2><td class="tdInfoArea">2 - 1 ${scoreboard}</td><p>Last update: ${stamp}</p>`);

test('period and total clocks support cumulative and per-period reports',()=>{
 for(const text of ['2nd Period 32:30','Period 2 12:30']){
  const clock=parseMatchClock(text);assert.equal(clock.period,2);assert.equal(clock.elapsedSeconds,1950);assert.equal(clock.periodElapsedSeconds,750);
  const state=matchStatus(fixture,report(text),now);assert.equal(state.label,'Period 2 · pågår');assert.equal(state.compact,'P2');assert.equal(state.secondary,'12:30');assert.equal(state.total,'32:30');
 }
});

test('explicit intermissions stay paused, with no assumed restart countdown',()=>{
 for(const text of ['End of 1st Period','1st Intermission','Paus efter period 1']){
  const state=matchStatus(fixture,report(text),now);assert.equal(state.label,'Periodpaus');assert.equal(state.compact,'Paus');assert.equal(state.total,'20:00');assert.equal(state.secondary,'Efter P1');
 }
 const pause=matchStatus(fixture,report('Intermission'),now);assert.equal(pause.paused,true);assert.equal(pause.period,null);assert.equal(pause.total,null);
 const ambiguous=parseMatchClock('Period 2 20:00 Intermission');assert.equal(ambiguous.elapsedSeconds,null);
 assert.equal(parseMatchClock('Period 2 12:30 Time out').phase,'stopped');
});

test('overtime periods and shootouts are separate; no assumed overtime duration',()=>{
 const ot=matchStatus(fixture,report('5th Period 03:20'),now);assert.equal(ot.overtime,true);assert.equal(ot.periodLabel,'Förlängning 2');assert.equal(ot.periodTime,'03:20');assert.equal(ot.total,null);
 const shootout=matchStatus(fixture,report('Shootout'),now);assert.equal(shootout.shootout,true);assert.equal(shootout.period,null);assert.equal(shootout.total,null);
});

test('missing or ambiguous time retains known period but never uses event or start time',()=>{
 for(const text of ['Period 2','Period 2 20:00','Period 2 12:30 remaining','Period 2 25:00 26:00']){
  const clock=parseMatchClock(text);assert.equal(clock.period,2);assert.equal(clock.elapsedSeconds,null);
 }
 const detail=parseEvents('<h2>A - B</h2><td class="tdInfoArea">2 - 1</td><tr><td>49:34</td><td>2 min</td><td>A</td><td>Holding</td></tr>');
 assert.equal(detail.clock,null);assert.equal(matchStatus(fixture,{...detail,sourceUpdatedAt:now},now).label,'Matchtid saknas');
 assert.equal(matchStatus({...fixture,status:'scheduled'},null,now).label,'Inför nedsläpp');
});

test('stale reports and failed refreshes retain frozen time without claiming current play',()=>{
 const detail=report('Period 3 12:30');
 const before=matchStatus(fixture,detail,now),after=matchStatus(fixture,detail,now+300001);
 assert.equal(before.live,true);assert.equal(after.live,false);assert.equal(after.label,'Senast rapporterat');assert.equal(before.total,after.total);
 assert.equal(matchStatus(fixture,detail,now,true).live,false);
 assert.equal(matchStatus(fixture,{...detail,sourceUpdatedAt:null},now).live,false);
 assert.equal(matchStatus(fixture,{...detail,sourceUpdatedAt:now+120001},now).live,false);
 assert.equal(matchStatus(fixture,{...detail,home:'C'},now).total,null);
});

test('verified newer reports win and final reports clear the live clock',()=>{
 const old=applyGameReport({...fixture},report('Period 1 12:00','2026-10-23 19:30:00'));
 assert.equal(matchStatus(old,report('Period 2 12:00'),now).total,'32:00');
 const newer=applyGameReport({...fixture},report('Period 3 12:00'));
 assert.equal(matchStatus(newer,{...report('Period 1 12:00'),sourceUpdatedAt:now-1000},now).total,'52:00');
 const final=applyGameReport({...fixture},report('Final Score'));
 const state=matchStatus(final,report('Period 3 19:00'),now);assert.equal(state.label,'Slut');assert.equal(state.clock,null);assert.equal(state.live,false);
 assert.throws(()=>applyGameReport({...fixture},{...report('Period 1 12:00'),away:'C'}));
});

test('schedule enrichment propagates source clock, intermission and timestamps to games',async()=>{
 const games=[{...fixture,eventId:'1110011'}];
 const partial=await updateGameStatuses(games,'2026-10-23',async()=>'<h2>A - B</h2><td class="tdInfoArea">2 - 1 End of 2nd Period</td><p>Last update: 2026-10-23 20:00:00</p>');
 assert.equal(partial,false);assert.equal(games[0].clock.phase,'intermission');assert.equal(games[0].clock.elapsedSeconds,2400);assert.equal(games[0].sourceUpdatedAt,now);
 const state=matchStatus(games[0],null,now);assert.equal(state.compact,'Paus');assert.equal(state.total,'40:00');assert.equal(state.live,true);
});
