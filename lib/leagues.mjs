import {GROUPS} from './hockey.mjs';
export const leagueForGame=game=>game.leagueId||GROUPS.find(group=>group.id===game.groupId)?.leagueId||'hockeytvaan';
export const teamKey=(team,group)=>JSON.stringify([group,team]);
export function teamEntry(key){
 try{const value=JSON.parse(key);if(Array.isArray(value)&&value.length===2&&GROUPS.some(g=>g.id===value[0])&&typeof value[1]==='string')return {team:value[1],group:value[0]};}catch{}
 return {team:key,group:null};
}
export function followsTeam(saved,team,group){
 return saved.includes(teamKey(team,group))||(GROUPS.find(g=>g.id===group)?.leagueId==='hockeytvaan'&&saved.includes(team));
}
export function toggleTeamFavorite(saved,team,group){
 const key=teamKey(team,group),legacy=GROUPS.find(g=>g.id===group)?.leagueId==='hockeytvaan';
 return followsTeam(saved,team,group)?saved.filter(value=>value!==key&&!(legacy&&value===team)):[...saved,key];
}
export function favoriteRequests(date,league,savedGames){
 return [...new Map([{date,league},...savedGames.map(game=>({date:game.date,league:leagueForGame(game)}))].map(request=>[request.league+'|'+request.date,request])).values()];
}
