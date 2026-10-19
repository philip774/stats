import test from 'node:test';
import assert from 'node:assert/strict';
import {gameKey, toggleSavedGame, mergeSavedGames, readFavoriteTeams, readSavedGames} from '../lib/favorites.mjs';

const scheduled = {id:'fixture', groupId:'21088', date:'2026-10-20', time:'19:00', home:'Falu IF', away:'Valbo HC', group:'Väst A', region:'Väst', status:'scheduled', homeScore:null, awayScore:null};
const live = {...scheduled, id:'21088-1117400', eventId:'1117400', status:'live', homeScore:1, awayScore:0};

test('upcoming game favorites survive upstream ID changes when a game starts', () => {
  assert.equal(gameKey(scheduled), gameKey(live));
  const saved = toggleSavedGame([], scheduled);
  const refreshed = mergeSavedGames(saved, [live]);
  assert.equal(refreshed.length, 1);
  assert.equal(refreshed[0].eventId, '1117400');
  assert.equal(refreshed[0].homeScore, 1);
  assert.deepEqual(toggleSavedGame(refreshed, live), []);
});

test('same teams on another date are separate saved games', () => {
  const rematch = {...scheduled, date:'2026-11-01'};
  assert.equal(toggleSavedGame([scheduled], rematch).length, 2);
  assert.deepEqual(mergeSavedGames([scheduled, rematch], [live]), [live, rematch]);
});

test('stored favorites handle corrupt values and preserve existing team favorites', () => {
  assert.deepEqual(readFavoriteTeams('["Falu IF",null,"Falu IF","Valbo HC"]'), ['Falu IF','Valbo HC']);
  assert.deepEqual(readFavoriteTeams('{bad'), []);
  assert.deepEqual(readSavedGames('{bad'), []);
  assert.deepEqual(readSavedGames('[null,{"home":"invalid"}]'), []);
  assert.deepEqual(readSavedGames(JSON.stringify([scheduled, scheduled])), [scheduled]);
});
