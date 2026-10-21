import test from 'node:test';
import assert from 'node:assert/strict';
import {parseRoster,parseTeamPlayers,mergePlayers,playerAge,playerKey,readFavoritePlayers} from '../lib/players.mjs';
import {COMPETITIONS,GROUPS,groupsForLeague} from '../lib/hockey.mjs';
import {favoriteRequests,followsTeam,toggleTeamFavorite,teamKey} from '../lib/leagues.mjs';
const row=c=>'<tr>'+c.map(v=>'<td>'+v+'</td>').join('')+'</tr>';
const heading=team=>'<tr><th class="tdTitle">'+team+'</th></tr>';
const roster=team=>heading(team)+row(['68','Haglund, Oscar','2000-11-02','CE','L','180','80','SWE','Test IK']);
const scoring=team=>heading(team)+'<tr><th>Playing Statistics</th></tr>'+row(['1','68','Haglund, Oscar','CE','5','4','7','11','0','0','0','0']);
test('roster profiles join complete season stats and preserve published zero values',()=>{
 const players=mergePlayers(parseRoster(roster('Falu IF')),parseTeamPlayers(scoring('Falu IF')),GROUPS[2]);
 assert.equal(players.length,1);assert.equal(players[0].name,'Oscar Haglund');assert.equal(players[0].height,180);assert.equal(players[0].skater.points,11);assert.equal(players[0].skater.penaltyMinutes,0);
 const other=mergePlayers(parseRoster(roster('Falu IF')),parseTeamPlayers(scoring('Valbo HC')),GROUPS[2]);assert.equal(other.length,2);assert.equal(other[0].skater,null);assert.notEqual(playerKey(other[0]),playerKey(other[1]));
});
test('goalie profiles use actual appearances, decimal save percentage and GAA',()=>{
 const html=heading('Alfta Hockey')+'<tr><th>Goalkeeping Statistics</th></tr>'+row(['1','30','Törnqvist, Riku','5','5','4','242:17','10','103','113','91.15','2.48','1','1','3']);
 const [player]=parseTeamPlayers(html);assert.equal(player.position,'GK');assert.equal(player.goalie.played,4);assert.equal(player.goalie.savePercentage,91.15);assert.equal(player.goalie.goalsAgainstAverage,2.48);assert.equal(player.skater,null);
});

test('lower-division rosters retain players when height and weight are not published',()=>{
 const html=heading('Test HC')+'<tr><td>9</td><td>Test, Joel</td><td>2000-02-08</td><td>LW</td><td>R</td><td colspan="2">&nbsp;</td><td>SWE</td><td>Test SK</td></tr>';
 const [player]=parseRoster(html);assert.equal(player.name,'Joel Test');assert.equal(player.height,null);assert.equal(player.weight,null);assert.equal(player.nationality,'SWE');assert.equal(player.youthClub,'Test SK');
});

test('national and regional skater columns map special teams, shots and faceoffs correctly',()=>{
 const html=heading('Test HC')+'<tr><th>Playing Statistics</th></tr>'+row(['1','33','Test, Johan','CE','10','2','6','8','2','7','5','2','1','0','1','22','9.09','12','8','20','60.00']);
 const [player]=parseTeamPlayers(html);assert.equal(player.skater.plusMinus,2);assert.equal(player.skater.gameWinningGoals,1);assert.equal(player.skater.powerPlayGoals,0);assert.equal(player.skater.shortHandedGoals,1);assert.equal(player.skater.shots,22);assert.equal(player.skater.shootingPercentage,9.09);assert.equal(player.skater.faceoffsWon,12);assert.equal(player.skater.faceoffPercentage,60);
 const [regional]=parseTeamPlayers(scoring('Test HC'));assert.equal(regional.skater.gameWinningGoals,0);assert.equal(regional.skater.shots,null);assert.equal(regional.skater.faceoffPercentage,null);
});
test('invalid sources and corrupt stored favorites do not become player profiles',()=>{assert.throws(()=>parseRoster('<html>Access denied</html>'));assert.throws(()=>parseTeamPlayers('<html>Access denied</html>'));assert.deepEqual(readFavoritePlayers('[null,{}]'),[]);assert.deepEqual(readFavoritePlayers('{bad'),[]);assert.equal(playerAge('2000-11-02','2026-10-21'),25);assert.equal(playerAge('2000-11-02','2026-11-02'),26);assert.equal(playerAge(null,'2026-11-02'),null)});
test('league catalogs cover all six senior tiers without duplicate IDs or mixed leagues',()=>{assert.equal(groupsForLeague('hockeytvaan').length,9);assert.equal(groupsForLeague('hockeyettan').length,2);assert.equal(groupsForLeague('hockeytrean').length,16);assert.equal(groupsForLeague('hockeyfyran').length,3);assert.equal(groupsForLeague('shl')[0].id,'20961');assert.equal(GROUPS.length,36);assert.equal(new Set(GROUPS.map(g=>g.id)).size,GROUPS.length);assert.ok(COMPETITIONS.every(league=>groupsForLeague(league.id).length>0));assert.deepEqual(groupsForLeague('invalid'),[])});
test('team favorites distinguish the same club across leagues and preserve old favorites',()=>{
 const saved=toggleTeamFavorite([],'Luleå HF','20961');assert.equal(followsTeam(saved,'Luleå HF','20961'),true);assert.equal(followsTeam(saved,'Luleå HF','20960'),false);
 assert.equal(followsTeam(['Falu IF'],'Falu IF','21088'),true);assert.equal(followsTeam(['Luleå HF'],'Luleå HF','20961'),false);assert.deepEqual(toggleTeamFavorite(['Falu IF'],'Falu IF','21088'),[]);
 assert.deepEqual(toggleTeamFavorite(saved,'Luleå HF','20961'),[]);assert.equal(saved[0],teamKey('Luleå HF','20961'));
});
test('saved match refreshes include each league and date exactly once',()=>{const requests=favoriteRequests('2026-10-21','shl',[{date:'2026-10-21',groupId:'20961'},{date:'2026-10-21',groupId:'21088'},{date:'2026-10-20',groupId:'20960'}]);assert.deepEqual(requests,[{date:'2026-10-21',league:'shl'},{date:'2026-10-21',league:'hockeytvaan'},{date:'2026-10-20',league:'sdhl'}])});
