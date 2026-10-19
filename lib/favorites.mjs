// A match gets a new upstream ID when reporting starts. Use its fixture identity
// so a saved upcoming game remains saved when it becomes live.
export const gameKey = game => JSON.stringify([game.groupId, game.date, game.home, game.away]);

export function toggleSavedGame(saved, game) {
  const key = gameKey(game);
  return saved.some(item => gameKey(item) === key)
    ? saved.filter(item => gameKey(item) !== key)
    : [...saved, game];
}

export function mergeSavedGames(saved, fresh) {
  const matches = new Map(fresh.map(game => [gameKey(game), game]));
  return saved.map(game => matches.get(gameKey(game)) || game);
}

export function readFavoriteTeams(raw) {
  try {
    const value = JSON.parse(raw || '[]');
    return Array.isArray(value) ? [...new Set(value.filter(team => typeof team === 'string'))] : [];
  } catch { return []; }
}

export function readSavedGames(raw) {
  try {
    const value = JSON.parse(raw || '[]');
    if (!Array.isArray(value)) return [];
    return [...new Map(value.filter(game => game &&
      ['groupId', 'date', 'home', 'away', 'time', 'group', 'region', 'status'].every(key => typeof game[key] === 'string') &&
      /^\d{4}-\d{2}-\d{2}$/.test(game.date) &&
      [game.homeScore, game.awayScore].every(score => score === null || Number.isFinite(score))
    ).map(game => [gameKey(game), game])).values()];
  } catch { return []; }
}
