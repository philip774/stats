import assert from 'node:assert/strict';
import test from 'node:test';
import {parseSchedule,parseEvents,GROUPS} from '../lib/hockey.mjs';
const row=c=>'<tr>'+c.map(x=>'<td>'+x+'</td>').join('')+'</tr>';
test('West format keeps the date across rows, decodes names and never invents scores',()=>{
const html=row(['2026-10-02','2026-10-02 19:00','19:00','Malungs IF &nbsp;-&nbsp; Ockelbo HC','<a href="/Game/Events/1117396">3 - 4</a>','(0-1, 0-1, 3-1)','','Malungs Ishall'])+row(['','','19:00','G&#xE4;vle GIK - Bollnäs IS','','','','Arena']);
const g=parseSchedule(html,GROUPS[2]);assert.equal(g.length,2);assert.equal(g[0].eventId,'1117396');assert.equal(g[0].awayScore,4);assert.equal(g[1].date,'2026-10-02');assert.equal(g[1].home,'Gävle GIK');assert.equal(g[1].homeScore,null);
});
test('Syd and Norr format reads combined date/time and round column',()=>{
const [g]=parseSchedule(row(['1','2026-10-17 18:00','Bodens Ishockeyklubb - Kiruna AIF','7 - 2','(2-1, 2-1, 3-0)','93','HIVE Arena']),GROUPS[6]);assert.equal(g.date,'2026-10-17');assert.equal(g.time,'18:00');assert.equal(g.homeScore,7);assert.equal(g.venue,'HIVE Arena');
});
test('Event score comes from score panel, with goals and penalties preserved',()=>{
const html='<h2>Malungs IF - Ockelbo HC</h2><td class="tdInfoArea"><div>3 - 4</div><div>Final Score</div></td>'+row(['56:00','3-3 (EQ)','MAL','9. Norgren, David'])+row(['52:21','2 min','MAL','Hooking']);
const g=parseEvents(html);assert.equal(g.status,'finished');assert.equal(g.homeScore,3);assert.equal(g.awayScore,4);assert.equal(g.events.length,2);assert.equal(g.events[0].type,'3-3 (EQ)');
});
test('Unrecognized or blocked upstream pages are errors, never empty success',()=>{assert.throws(()=>parseSchedule('<html>Access denied</html>',GROUPS[0]));assert.throws(()=>parseEvents('<html>Access denied</html>'));});
