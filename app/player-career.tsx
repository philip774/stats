'use client';
import {useState} from 'react';
import {careerByLeague,careerClubs,careerLeagueKey,careerStage,careerStageLabel,careerTotals,prepareCareer} from '../lib/career.mjs';
import type {SeasonRecord} from '../lib/types';

const value=(n:number|null|undefined)=>typeof n==='number'&&Number.isFinite(n)?n.toLocaleString('sv-SE',{maximumFractionDigits:2}):'–';
const shortSeason=(season:string)=>season.replace(/\/(\d{2})(\d{2})$/,'/$2');

export function PlayerCareer({history,goalie,loading}:{history:SeasonRecord[];goalie:boolean;loading:boolean}){
 const [league,setLeague]=useState('all'),[stage,setStage]=useState('all');
 const {rows}=prepareCareer(history) as {rows:SeasonRecord[]};
 const leagues=[...new Map(rows.map(row=>[careerLeagueKey(row),row.competition||'Liga ej angiven'])).entries()].sort((a,b)=>a[1].localeCompare(b[1],'sv'));
 const stages=[...new Set(rows.map(careerStage))] as string[];
 const visible=rows.filter(row=>(league==='all'||careerLeagueKey(row)===league)&&(stage==='all'||careerStage(row)===stage));
 const totals=careerTotals(visible),leagueTotals=careerByLeague(visible),clubs=careerClubs(rows);
 const seasons=[...new Set(rows.map(row=>row.season))].sort();
 const clubCount=new Set(clubs.flatMap(season=>season.clubs.map((club:{team:string})=>club.team))).size;
 if(!rows.length)return loading?null:<div className="career-empty"><h4>Karriärhistorik saknas</h4><p>De anslutna källorna publicerar ingen verifierad karriärhistorik för den här spelaren just nu. Aktuell seriestatistik finns under Statistik.</p><p>Utlandssäsonger och tidigare klubbar visas här när uppgifterna finns tillgängliga.</p></div>;
 const summary=goalie?[['Matcher',totals.played],['SVS %',totals.savePercentage],['Nollor',totals.shutouts]]:[['Matcher',totals.played],['Mål',totals.goals],['Assist',totals.assists],['Poäng',totals.points]];
 return <section className="player-career" aria-label="Spelarens karriär">
  <div className="career-intro"><span>PUBLICERAD KARRIÄR</span><h4>{shortSeason(seasons[0])}{seasons.length>1?' – '+shortSeason(seasons[seasons.length-1]):''}</h4><p>{seasons.length} {seasons.length===1?'säsong':'säsonger'} · {clubCount} lag · {leagues.length} {leagues.length===1?'liga':'ligor'}</p></div>
  <p className="career-coverage">Visar säsongerna i ligans profil, även utländska ligor. Tidigare år och tävlingar kan saknas.</p>
  <div className="career-filters"><label>Liga<select aria-label="Karriärliga" value={league} onChange={e=>setLeague(e.target.value)}><option value="all">Alla ligor</option>{leagues.map(([id,label])=><option key={id} value={id}>{label}</option>)}</select></label><label>Tävlingsfas<select aria-label="Karriärens tävlingsfas" value={stage} onChange={e=>setStage(e.target.value)}><option value="all">Alla faser</option>{stages.map(id=><option key={id} value={id}>{careerStageLabel(id)}</option>)}</select></label></div>
  {visible.length>0?<>
   <h4 className="profile-heading">Summerat för ditt urval</h4>
   {totals.conflicting?<p className="notice">Källan innehåller motstridiga rader. Summering visas när uppgifterna går att skilja åt.</p>:<><div className="profile-numbers career-numbers">{summary.map(([label,n])=><div key={String(label)}><b>{value(n as number|null)}</b><span>{label}</span></div>)}</div><div className="career-secondary">{goalie?<><span>{value(totals.saves)} räddningar</span><span>{value(totals.goalsAgainst)} insläppta mål</span></>:<><span>{value(totals.pointsPerGame)} poäng/match</span><span>{value(totals.penaltyMinutes)} utv. min</span></>}</div></>}
   <p className="table-key">Summeringen gäller endast visade rader. Saknade värden ger –.{goalie?' SVS % beräknas från räddningar och insläppta mål; GAA summeras inte.':''}</p>
   <details className="career-detail"><summary>Statistik per liga</summary><div className="scroll-table"><table className="history-table career-leagues"><caption className="sr-only">Summerat per liga och tävlingsfas</caption><thead><tr><th>Liga / fas</th><th>M</th>{goalie?<><th>SVS %</th><th>Nollor</th></>:<><th>G</th><th>A</th><th>P</th></>}</tr></thead><tbody>{leagueTotals.map(group=><tr key={group.key}><th>{group.competition}<small>{group.stage}</small></th>{(goalie?[group.totals.played,group.totals.savePercentage,group.totals.shutouts]:[group.totals.played,group.totals.goals,group.totals.assists,group.totals.points]).map((n,i)=><td key={i}>{value(n)}</td>)}</tr>)}</tbody></table></div></details>
  </>:<p className="quiet-text">Inga publicerade säsonger för detta urval.</p>}
  <details className="career-detail"><summary>Klubbhistorik · {clubCount} lag</summary><p className="career-coverage">Lag per säsong i hela den publicerade historiken. Exakta övergångsdatum, lån och ordningen mellan lag under samma säsong framgår inte av källan.</p><ol className="club-timeline">{clubs.map(season=><li key={season.season}><time>{shortSeason(season.season)}</time><div>{season.clubs.map((club:{team:string;competitions:string[]})=><p key={club.team}><b>{club.team}</b><small>{club.competitions.join(' · ')}</small></p>)}</div></li>)}</ol></details>
  {visible.length>0&&<><h4 className="profile-heading">Säsong för säsong</h4><div className="scroll-table"><table className="history-table"><caption className="sr-only">Karriärstatistik för valt urval</caption><thead><tr><th>Säsong / lag</th><th>M</th>{goalie?<><th>SVS %</th><th>GAA</th><th>GA</th><th>SVS</th><th>Nollor</th></>:<><th>G</th><th>A</th><th>P</th><th>+/−</th><th>Utv</th></>}</tr></thead><tbody>{visible.map((row,index)=><tr key={index}><th>{shortSeason(row.season)}<small>{[row.team,row.competition,careerStage(row).startsWith('other:')?row.stage:careerStageLabel(careerStage(row))].filter(Boolean).join(' · ')}</small></th>{(goalie?[row.played,row.savePercentage,row.gaa,row.goalsAgainst,row.saves,row.shutouts]:[row.played,row.goals,row.assists,row.points,row.plusMinus,row.penaltyMinutes]).map((n,i)=><td key={i}>{value(n)}</td>)}</tr>)}</tbody></table></div><p className="table-key">Grundserie och slutspel behålls som separata rader. {goalie?'M = spelade matcher · GA = insläppta mål · SVS = räddningar.':'M = matcher · G = mål · A = assist · P = poäng.'}</p></>}
 </section>;
}
