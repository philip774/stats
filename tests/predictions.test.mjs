import test from 'node:test';
import assert from 'node:assert/strict';
import {buildBaseline,forecast,percentages,predictionState,regulationScore} from '../lib/predictions.mjs';
import {parseMatchClock,stockholmTimestamp} from '../lib/match-clock.mjs';
import {parseEvents} from '../lib/hockey.mjs';
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-9,`${a} != ${b}`);
const target={groupId:'x',date:'2026-10-22',time:'19:00',home:'A',away:'B',status:'scheduled',homeScore:null,awayScore:null};
const games=Array.from({length:8},(_,i)=>({...target,id:String(i),date:'2026-10-'+String(i+1).padStart(2,'0'),home:i%2?'B':'A',away:i%2?'A':'B',homeScore:3,awayScore:2,periods:'(1-1, 1-0, 1-1)',status:'finished'}));

test('result and next-goal probabilities sum to one, remain bounded and respect symmetry',()=>{
 for(const elapsed of [0,600,1800,3590,3600])for(const [h,a] of [[0,0],[1,0],[0,2],[5,3]]){
  const p=forecast(3,2.5,h,a,elapsed),mirror=forecast(2.5,3,a,h,elapsed);
  close(Object.values(p.result).reduce((n,v)=>n+v,0),1);close(Object.values(p.nextGoal).reduce((n,v)=>n+v,0),1);
  for(const v of [...Object.values(p.result),...Object.values(p.nextGoal)])assert.ok(v>=0&&v<=1+1e-12);
  close(p.result.home,mirror.result.away);close(p.result.draw,mirror.result.draw);close(p.nextGoal.home,mirror.nextGoal.away);
 }
 const equal=forecast(3,3,0,0,0);close(equal.result.home,equal.result.away);
});

test('a late lead raises win probability while no-more-goals includes the finite time horizon',()=>{
 const early=forecast(3,3,1,0,0),late=forecast(3,3,1,0,3540),end=forecast(3,3,1,0,3600);
 assert.ok(late.result.home>early.result.home);assert.ok(late.nextGoal.none>.9);assert.ok(late.nextGoal.home<.05);
 assert.equal(end.result.home,1);assert.equal(end.nextGoal.none,1);assert.equal(end.nextGoal.home,0);assert.equal(end.goalWithinFiveMinutes,0);
 const tied=forecast(3,3,1,1,3600);assert.equal(tied.result.draw,1);
});

test('malformed scores, missing rates and impossible times never become forecasts',()=>{
 for(const args of [[null,3,0,0,0],[NaN,3,0,0,0],[3,3,null,0,0],[3,3,-1,0,0],[3,3,0,0,-1],[3,3,0,0,3601],[3,3,0,0,null]])assert.equal(forecast(...args),null);
});

test('training excludes the target, same-day/future results, other groups and duplicate matches',()=>{
 const original=buildBaseline(games,target);
 const polluted=[...games,{...games[0]},...['2026-10-22','2026-10-23'].map(date=>({...games[0],date,homeScore:99})),{...games[0],groupId:'other',homeScore:99}];
 assert.deepEqual(buildBaseline(polluted,target),original);assert.equal(original.historyGames,8);assert.equal(original.homeGames,8);assert.equal(original.awayGames,8);
 assert.equal(buildBaseline(games.slice(0,3),target).available,false);assert.equal(buildBaseline(games,{...target,home:'New club'}).available,false);
});

test('regulation history excludes overtime/deciding shootout goals and retains real zeroes',()=>{
 assert.deepEqual(regulationScore({homeScore:4,awayScore:3,periods:'(1-1, 1-1, 1-1, 0-0, 1-0)'}),{home:3,away:3,exact:true});
 assert.deepEqual(regulationScore({homeScore:0,awayScore:0,periods:'(0-0, 0-0, 0-0)'}),{home:0,away:0,exact:true});
 assert.equal(regulationScore({homeScore:4,awayScore:3,periods:'OT'}),null);
});

test('clock is read only from the scoreboard, never from latest event or planned faceoff',()=>{
 assert.equal(parseMatchClock('3 - 1 (1-0, 1-1) 19:00'),null);
 const row='<tr><td>48:22</td><td>2 min</td><td>A</td><td>Penalty</td></tr>';
 const detail=parseEvents('<h2>A - B</h2><td class="tdInfoArea">3 - 1</td>'+row);assert.equal(detail.clock,null);assert.equal(detail.status,'live');
 assert.equal(parseMatchClock('3 - 1 Period 2 12:30').elapsedSeconds,1950);
 assert.equal(parseMatchClock('3 - 1 2nd Period 32:30').elapsedSeconds,1950);
 assert.equal(parseMatchClock('3 - 1 Period 2 20:00'),null);
 assert.equal(parseMatchClock('3 - 1 Period 2 12:30 remaining'),null);
 assert.equal(parseMatchClock('3 - 1 Final Score'),null);
 assert.equal(parseMatchClock('3 - 1 Overtime').phase,'overtime');
});

test('source timestamps use Stockholm daylight saving rules and reject invalid dates',()=>{
 assert.equal(stockholmTimestamp('2026-10-22 19:00:00'),Date.parse('2026-10-22T17:00:00Z'));
 assert.equal(stockholmTimestamp('2026-11-22 19:00:00'),Date.parse('2026-11-22T18:00:00Z'));
 assert.equal(stockholmTimestamp('2026-02-31 19:00:00'),null);assert.equal(stockholmTimestamp(null),null);
});

test('missing/stale clocks, fetch errors and mismatched teams suppress live estimates',()=>{
 const now=Date.parse('2026-10-22T18:00:00Z'),game={...target,status:'live',homeScore:1,awayScore:0};
 const detail={status:'live',home:'A',away:'B',clock:{elapsedSeconds:1800,phase:'regulation'},sourceUpdatedAt:now,homeScore:1,awayScore:0};
 assert.equal(predictionState(game,detail,now).state,'live');
 assert.equal(predictionState(game,{...detail,sourceUpdatedAt:now-300001},now).reason,'stale');
 assert.equal(predictionState(game,{...detail,clock:null},now).reason,'clock');
 assert.equal(predictionState(game,{...detail,home:'C'},now).reason,'source');
 assert.equal(predictionState(game,detail,now,true).reason,'source');
 assert.equal(predictionState(game,{...detail,clock:{phase:'shootout'}},now).reason,'overtime');
 assert.equal(predictionState(game,{...detail,status:'finished'},now).state,'finished');
 assert.equal(predictionState(target,null,Date.parse('2026-10-22T10:00:00Z')).state,'pregame');
 assert.equal(predictionState(target,null,now).state,'unavailable');
});

test('display rounding totals 100% including three-way rounding ties',()=>{
 assert.deepEqual(percentages([1,1,1]),[34,33,33]);assert.equal(percentages([.336,.336,.328]).reduce((n,v)=>n+v,0),100);
 assert.equal(percentages([.48,.04,.48]).reduce((n,v)=>n+v,0),100);
});

test('a fresh scoreboard update changes the forecast from the reported clock and score',()=>{
 const now=Date.parse('2026-10-22T18:00:00Z');
 const report=(score,clock)=>parseEvents('<h2>A - B</h2><td class="tdInfoArea">'+score+' 3rd Period '+clock+'</td><p>Last update: 2026-10-22 20:00:00</p>');
 const before=report('1 - 0','50:00'),after=report('1 - 1','59:00');
 const first=predictionState({...target,status:'live'},before,now),second=predictionState({...target,status:'live'},after,now);
 assert.equal(first.state,'live');assert.equal(second.elapsedSeconds,3540);
 const a=forecast(3,3,first.homeScore,first.awayScore,first.elapsedSeconds),b=forecast(3,3,second.homeScore,second.awayScore,second.elapsedSeconds);
 assert.ok(a.result.home>b.result.home);assert.ok(b.result.draw>a.result.draw);assert.ok(b.nextGoal.none>a.nextGoal.none);
 assert.equal(predictionState({...target,status:'live'},{...after,clock:{elapsedSeconds:3601}},now).reason,'clock');
});
