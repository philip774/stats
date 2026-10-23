'use client';

import {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {ArrowUpRight, CalendarDays, Check, ChevronDown, ChevronLeft, ChevronRight, Info, Moon, Plus, Radio, RefreshCw, Search, SlidersHorizontal, Star, Sun, Trophy, Users, X} from 'lucide-react';
import {gameKey, mergeSavedGames, readFavoriteTeams, readSavedGames, toggleSavedGame} from '../lib/favorites.mjs';
import {LeagueTables,MatchInsights,MatchStatistics,TeamProfile} from './hockey-stats';
import {MatchPredictions} from './match-predictions';
import {ThemePicker,useTheme} from './theme';
import type {Game,Detail,Player} from '../lib/types';
import {COMPETITIONS,GROUPS,groupLabel} from '../lib/hockey.mjs';
import {favoriteRequests,followsTeam,leagueForGame,teamEntry,toggleTeamFavorite} from '../lib/leagues.mjs';
import {playerKey,readFavoritePlayers} from '../lib/players.mjs';
import {PlayerProfile,PlayerRows} from './players';
import {CompactMatchStatus,MatchClockPanel} from './match-clock';
import {matchStatus} from '../lib/match-status.mjs';

type Feed = {games:Game[]; dates:string[]; teams:string[]; teamGroups:Record<string,string>; failed:string[]; checkedAt:string; error?:string};
type Page = 'matches'|'live'|'favorites'|'tables';
type Sheet = 'teams'|'filters'|'about'|null;
const today = () => new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Stockholm'}).format(new Date());
const shift = (date:string, n:number) => {const d=new Date(date+'T12:00:00Z'); d.setUTCDate(d.getUTCDate()+n); return d.toISOString().slice(0,10)};
const dateLabel = (date:string, options:Intl.DateTimeFormatOptions) => new Date(date+'T12:00:00Z').toLocaleDateString('sv-SE',options);
const initials = (name:string) => name.replace(/\b(IF|IK|HC|SK|HK|IS|GIK)\b/g,'').trim().split(/\s+/).map(s=>s[0]).join('').slice(0,2).toUpperCase();

function Crest({name, large=false}:{name:string;large?:boolean}) {
  const hue = [...name].reduce((n,c)=>n+c.charCodeAt(0),0)%360;
  return <span aria-hidden="true" className={'crest'+(large?' large':'')} style={{'--h':hue} as React.CSSProperties}>{initials(name)}</span>;
}

export default function Matchcenter() {
  const {theme,setTheme,dark}=useTheme();
  const [page,setPage]=useState<Page>('matches');
  const [competition,setCompetition]=useState('hockeytvaan');
  const [favoritePlayers,setFavoritePlayers]=useState<Player[]>([]);
  const [player,setPlayer]=useState<Player|null>(null);
  const [date,setDate]=useState(today);
  const [region,setRegion]=useState('Alla');
  const [query,setQuery]=useState('');
  const [searchOpen,setSearchOpen]=useState(false);
  const [onlyFollowed,setOnlyFollowed]=useState(false);
  const [favoriteTab,setFavoriteTab]=useState<'games'|'teams'|'players'>('games');
  const [teams,setTeams]=useState<string[]>([]);
  const [saved,setSaved]=useState<Game[]>([]);
  const [storageReady,setStorageReady]=useState(false);
  const [feed,setFeed]=useState<Feed|null>(null);
  const [extraGames,setExtraGames]=useState<Game[]>([]);
  const [extraFailed,setExtraFailed]=useState(false);
  const [loading,setLoading]=useState(true);
  const [now,setNow]=useState(()=>Date.now());
  const [error,setError]=useState('');
  const [selected,setSelected]=useState<Game|null>(null);
  const [detail,setDetail]=useState<Detail|null>(null);
  const [detailError,setDetailError]=useState('');
  const [sheet,setSheet]=useState<Sheet>(null);
  const [teamSearch,setTeamSearch]=useState('');
  const [eventFilter,setEventFilter]=useState<'all'|'goals'>('all');
  const [tableRefresh,setTableRefresh]=useState(0);
  const [matchTab,setMatchTab]=useState<'events'|'stats'|'prediction'|'history'>('events');
  const [profile,setProfile]=useState<{team:string;group:string}|null>(null);
  const savedRef=useRef<Game[]>([]);
  const requestRef=useRef<AbortController|null>(null);
  const modalRef=useRef<HTMLElement|null>(null);
  const activeDate=page==='live'?today():date;
  const savedDates=useMemo(()=>[...new Set(saved.map(g=>leagueForGame(g)+'|'+g.date))].sort().join(','),[saved]);
  const favoriteDates=page==='favorites'&&favoriteTab==='games'?savedDates:'';

  useEffect(()=>{
    const update=()=>setNow(Date.now()),timer=setInterval(update,15000);
    document.addEventListener('visibilitychange',update);
    return()=>{clearInterval(timer);document.removeEventListener('visibilitychange',update)};
  },[]);

  useEffect(()=>{
    try {setTeams(readFavoriteTeams(localStorage.getItem('tvaan-favorites')));setSaved(readSavedGames(localStorage.getItem('tvaan-games-v1')));setFavoritePlayers(readFavoritePlayers(localStorage.getItem('tvaan-player-favorites')));const league=localStorage.getItem('tvaan-league');if(COMPETITIONS.some(item=>item.id===league))setCompetition(league!)}catch{}
    setStorageReady(true);
  },[]);
  useEffect(()=>{savedRef.current=saved; if(storageReady)try{localStorage.setItem('tvaan-games-v1',JSON.stringify(saved))}catch{}},[saved,storageReady]);
  useEffect(()=>{if(storageReady)try{localStorage.setItem('tvaan-favorites',JSON.stringify(teams))}catch{}},[teams,storageReady]);

  useEffect(()=>{if(storageReady)try{localStorage.setItem('tvaan-player-favorites',JSON.stringify(favoritePlayers));localStorage.setItem('tvaan-league',competition)}catch{}},[favoritePlayers,competition,storageReady]);

  const refresh=useCallback(async()=>{
    requestRef.current?.abort();
    const controller=new AbortController(); requestRef.current=controller;
    setLoading(true);
    try {
      const requests=page==='favorites'&&favoriteTab==='games'?favoriteRequests(activeDate,competition,savedRef.current):[{date:activeDate,league:competition}];
      const responses=await Promise.allSettled(requests.map(async request=>{
        const response=await fetch('/api/games?date='+request.date+'&league='+request.league,{signal:controller.signal});
        const result=await response.json() as Feed;
        if(!response.ok)throw new Error(result.error||'Det gick inte att hämta matcher.');
        return result;
      }));
      if(controller.signal.aborted)return;
      const main=responses[0];
      const fresh=responses.flatMap(r=>r.status==='fulfilled'?r.value.games:[]);
      setExtraGames(fresh); setExtraFailed(responses.some(r=>r.status==='rejected'));
      setSaved(old=>{
        const updated=mergeSavedGames(old,fresh) as Game[];
        return JSON.stringify(old)===JSON.stringify(updated)?old:updated;
      });
      if(main.status==='rejected')throw main.reason;
      setFeed(main.value); setError('');
    } catch(e) {if(!controller.signal.aborted)setError((e as Error).message)}
    finally {if(!controller.signal.aborted)setLoading(false)}
  },[activeDate,page,favoriteTab,competition]);

  useEffect(()=>{setFeed(null);setExtraGames([]);setError('')},[activeDate,competition]);

  useEffect(()=>{
    refresh();
    const timer=setInterval(()=>{if(document.visibilityState==='visible')refresh()},30000);
    const visible=()=>{if(document.visibilityState==='visible')refresh()};
    document.addEventListener('visibilitychange',visible);
    return()=>{clearInterval(timer);requestRef.current?.abort();document.removeEventListener('visibilitychange',visible)};
  },[refresh,favoriteDates]);

  const currentGame=selected?([...extraGames,...(feed?.games||[])].find(g=>gameKey(g)===gameKey(selected))||saved.find(g=>gameKey(g)===gameKey(selected))||selected):null;
  const eventId=currentGame?.eventId;
  const home=currentGame?.home,away=currentGame?.away;
  useEffect(()=>{
    setDetail(null); setDetailError(''); setEventFilter('all');
    if(!eventId)return;
    const controller=new AbortController();
    async function load() {
      try {
        const response=await fetch('/api/game?id='+eventId,{signal:controller.signal});
        const result=await response.json() as Detail;
        if(!response.ok)throw new Error(result.error||'Matchhändelser kunde inte hämtas.');
        if(result.home!==home||result.away!==away)throw new Error('Matchrapporten stämmer inte med vald match.');
        if(!controller.signal.aborted){setDetail(result);setDetailError('')}
      } catch(e) {if(!controller.signal.aborted)setDetailError((e as Error).message)}
    }
    load();
    const timer=setInterval(()=>{if(document.visibilityState==='visible')load()},30000);
    const visible=()=>{if(document.visibilityState==='visible')load()};
    document.addEventListener('visibilitychange',visible);
    return()=>{controller.abort();clearInterval(timer);document.removeEventListener('visibilitychange',visible)};
  },[eventId,home,away]);

  const clockUnavailable=!!detailError||(!detail&&(!!error||(page==='favorites'&&!extraGames.some(g=>currentGame&&gameKey(g)===gameKey(currentGame)))));
  const currentStatus=currentGame?matchStatus(currentGame,detail,now,clockUnavailable):null;

  const modalOpen=!!currentGame||!!sheet||!!profile||!!player;
  useEffect(()=>{
    if(!modalOpen)return;
    const previousFocus=document.activeElement as HTMLElement|null;
    const oldOverflow=document.body.style.overflow;
    document.body.style.overflow='hidden';
    const panel=modalRef.current;
    panel?.querySelector<HTMLElement>('button')?.focus();
    const key=(event:KeyboardEvent)=>{
      if(event.key==='Escape'){setSelected(null);setSheet(null);setProfile(null);setPlayer(null)}
      if(event.key!=='Tab'||!panel)return;
      const elements=[...panel.querySelectorAll<HTMLElement>('button:not(:disabled),a[href],input,select')].filter(el=>el.getClientRects().length>0);
      const first=elements[0],last=elements.at(-1);
      if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus()}
      else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus()}
    };
    document.addEventListener('keydown',key);
    return()=>{document.body.style.overflow=oldOverflow;document.removeEventListener('keydown',key);previousFocus?.focus()};
  },[modalOpen,profile?.team,selected?.id,sheet,player?.name]);

  function toggleTeam(team:string,group:string){setTeams(old=>toggleTeamFavorite(old,team,group))}
  function togglePlayer(value:Player){setFavoritePlayers(old=>old.some(item=>playerKey(item)===playerKey(value))?old.filter(item=>playerKey(item)!==playerKey(value)):[...old,value])}
  function openPlayer(value:Player){setSelected(null);setSheet(null);setProfile(null);setPlayer(value)}
  function chooseCompetition(value:string){setCompetition(value);setRegion('Alla');setQuery('');setSearchOpen(false)}
  function toggleGame(game:Game){setSaved(old=>toggleSavedGame(old,game))}
  function navigate(next:Page){setPage(next);setQuery('');setSearchOpen(false);window.scrollTo({top:0,behavior:'smooth'})}
  function closeModal(){setSelected(null);setSheet(null);setProfile(null);setPlayer(null)}
  function openGame(game:Game){setPlayer(null);setProfile(null);setSheet(null);setMatchTab('events');setSelected(game)}
  function openTeam(team:string,group:string){setPlayer(null);setSelected(null);setSheet(null);setProfile({team,group})}
  const isSaved=(game:Game)=>saved.some(item=>gameKey(item)===gameKey(game));
  const followed=(game:Game)=>followsTeam(teams,game.home,game.groupId)||followsTeam(teams,game.away,game.groupId);
  const freshKeys=new Set(extraGames.map(gameKey));
  const visibleGames=(page==='favorites'?saved:feed?.games||[])
    .filter(game=>(page!=='live'||game.status==='live')&&(page==='favorites'||region==='Alla'||game.region===region)&&(!onlyFollowed||page!=='matches'||followed(game))&&(!query||(game.home+' '+game.away).toLowerCase().includes(query.toLowerCase())))
    .sort((a,b)=>Number(b.status==='live')-Number(a.status==='live')||a.date.localeCompare(b.date)||a.time.localeCompare(b.time));
  const sections=[...new Set(visibleGames.map(g=>g.date+'|'+g.groupId))];
  const liveCount=(feed?.games||[]).filter(game=>game.status==='live').length;
  const nextDate=feed?.dates.find(d=>d>activeDate);
  const previousDate=feed?.dates.filter(d=>d<activeDate).at(-1);
  const teamEntries=teams.map(key=>({...teamEntry(key),key}));
  const allTeams=[...new Set([...(feed?.teams||[]),...teamEntries.filter(entry=>entry.group?GROUPS.find(g=>g.id===entry.group)?.leagueId===competition:competition==='hockeytvaan').map(entry=>entry.team)])].sort((a,b)=>Number(followsTeam(teams,b,feed?.teamGroups?.[b]))-Number(followsTeam(teams,a,feed?.teamGroups?.[a]))||a.localeCompare(b,'sv'));
  const regions=[...new Set(GROUPS.filter(g=>g.leagueId===competition).map(g=>g.region))];
  const regionChoices=regions.length>1?['Alla',...regions]:['Alla'];
  const competitionName=COMPETITIONS.find(item=>item.id===competition)!.name;
  const title=page==='matches'?'Matcher':page==='live'?'Live':page==='tables'?'Statistik':'Favoriter';
  const subtitle=page==='tables'?competitionName+' · 2026/27':page==='favorites'?`${saved.length} ${saved.length===1?'match':'matcher'} · ${teams.length} lag · ${favoritePlayers.length} spelare`:dateLabel(activeDate,{weekday:'long',day:'numeric',month:'long'});

  return <>
    <div className="phone-app">
      <header className="app-header">
        <div className="top-line"><div className="brand-leagues"><a href="/" className="wordmark" aria-label="TVÅAN startsida"><span className="puck-mark">II</span>TVÅAN</a><label className="competition-picker"><select aria-label="Välj liga" value={competition} onChange={e=>chooseCompetition(e.target.value)}>{COMPETITIONS.map(item=><option value={item.id} key={item.id}>{item.name}</option>)}</select><ChevronDown size={12}/></label></div><div className="top-controls"><button className="icon-button subtle" aria-label={dark?'Slå på ljust läge':'Slå på mörkt läge'} onClick={()=>setTheme(dark?'light':'dark')}>{dark?<Sun size={19}/>:<Moon size={19}/>}</button><button className="icon-button subtle" aria-label="Inställningar och info" onClick={()=>setSheet('about')}><Info size={20}/></button></div></div>
        <div className="title-line"><div><h1>{title}{page==='live'&&<span className="title-live-dot"/>}</h1><p className="subtitle">{subtitle}</p></div><div className="header-actions">{page!=='favorites'&&page!=='tables'&&<button aria-label={searchOpen?'Stäng sökning':'Sök matcher'} className="icon-button" onClick={()=>{setSearchOpen(!searchOpen);setQuery('')}}>{searchOpen?<X size={21}/>:<Search size={21}/>}</button>}<button className="icon-button" disabled={loading} aria-label={page==='tables'?'Uppdatera statistik':'Uppdatera matcher'} onClick={()=>page==='tables'?setTableRefresh(n=>n+1):refresh()}><RefreshCw size={20} className={loading?'spin':''}/></button></div></div>
        {searchOpen&&<label className="search-field"><Search size={18}/><input autoFocus type="search" aria-label="Sök lag eller match" placeholder="Sök lag eller match" value={query} onChange={e=>setQuery(e.target.value)}/></label>}
        {page==='matches'&&<div className="date-navigation"><button className="icon-button" aria-label="Föregående dag" onClick={()=>setDate(shift(date,-1))}><ChevronLeft size={21}/></button><div className="date-days">{[-2,-1,0,1,2].map(n=>{const d=shift(date,n);return <button key={d} aria-pressed={n===0} className={n===0?'selected':''} onClick={()=>setDate(d)}><span>{d===today()?'Idag':dateLabel(d,{weekday:'short'}).replace('.','')}</span><b>{dateLabel(d,{day:'numeric'})}</b><i className={feed?.dates.includes(d)?'has-games':''}/></button>})}</div><label className="calendar-button" title="Välj datum"><CalendarDays size={20}/><input type="date" aria-label="Välj datum" value={date} onChange={e=>e.target.value&&setDate(e.target.value)}/></label></div>}
        {page==='favorites'&&<div className="segmented" aria-label="Favorittyp">{[['games','Matcher'],['teams','Lag'],['players','Spelare']].map(([value,name])=><button key={value} aria-pressed={favoriteTab===value} className={favoriteTab===value?'selected':''} onClick={()=>setFavoriteTab(value as 'games'|'teams'|'players')}>{name}</button>)}</div>}
      </header>

      <main>
        {page!=='tables'&&<div className="list-toolbar">
          <span>{page==='live'?`${liveCount} pågående matcher`:page==='favorites'?(favoriteTab==='games'?'SPARADE MATCHER':favoriteTab==='players'?'MINA SPELARE':'MINA LAG'):region==='Alla'?competitionName.toUpperCase():'REGION '+region.toUpperCase()}</span>
          {page==='matches'?<div className="toolbar-actions">{date!==today()&&<button onClick={()=>setDate(today())}>Idag</button>}<button className={onlyFollowed?'filter-active':''} aria-label="Filtrera matcher" onClick={()=>setSheet('filters')}><SlidersHorizontal size={16}/>{onlyFollowed?'Mina lag':'Filter'}<ChevronDown size={12}/></button></div>:page==='favorites'&&favoriteTab==='teams'?<button className="add-team" onClick={()=>{setTeamSearch('');setSheet('teams')}}><Plus size={17}/>Lägg till</button>:null}
        </div>}
        {page!=='tables'&&error&&<div className="notice error" role="alert"><Info size={18}/><div><b>Kunde inte uppdatera</b><p>{feed||page==='favorites'?'Senast sparade uppgifter visas. ':''}{error}</p></div><button aria-label="Försök igen" onClick={refresh}><RefreshCw size={18}/></button></div>}
        {page!=='tables'&&!error&&!!feed?.failed.length&&<div className="notice"><Info size={17}/><p>Rapporteringen är tillfälligt otillgänglig i {feed.failed.join(', ')}.</p></div>}
        {page==='favorites'&&favoriteTab==='games'&&extraFailed&&!error&&<div className="notice"><Info size={17}/><p>Vissa sparade matcher kunde inte uppdateras. Senast sparade uppgifter visas.</p></div>}

        {page==='tables'?<LeagueTables teams={teams} onTeam={openTeam} onPlayer={openPlayer} refreshToken={tableRefresh} competition={competition}/>:page==='favorites'&&favoriteTab==='players'?favoritePlayers.length?<PlayerRows players={favoritePlayers} onPlayer={openPlayer} showStats={false}/>:<div className="empty-state"><div className="empty-symbol"><Users size={30}/></div><h2>Dina favoritspelare</h2><p>Öppna en spelarprofil och följ spelaren här.</p><button className="primary" onClick={()=>navigate('tables')}>Hitta spelare<ChevronRight size={16}/></button></div>:page==='favorites'&&favoriteTab==='teams'?
          teams.length?<div className="group-card team-list">{teamEntries.map(entry=>{const group=entry.group||(competition==='hockeytvaan'?feed?.teamGroups?.[entry.team]:null);return <div className="team-row" key={entry.key}><button className="team-open" aria-label={'Visa lagprofil för '+entry.team+(group?' '+groupLabel(GROUPS.find(g=>g.id===group)!):'')} onClick={()=>{if(group)openTeam(entry.team,group);else{chooseCompetition('hockeytvaan');navigate('matches');setQuery(entry.team);setSearchOpen(true)}}}><Crest name={entry.team}/><span className="favorite-team-name">{entry.team}{group&&<small>{groupLabel(GROUPS.find(g=>g.id===group)!)}</small>}</span><ChevronRight size={16}/></button><button className="star-button saved" aria-label={'Sluta följa '+entry.team} aria-pressed onClick={()=>group?toggleTeam(entry.team,group):setTeams(old=>old.filter(key=>key!==entry.key))}><Star size={21} fill="currentColor"/></button></div>})}</div>:
          <div className="empty-state"><div className="empty-symbol"><Users size={30}/></div><h2>Vilket är ditt lag?</h2><p>Följ dina lag och hitta deras matcher snabbt.</p><button className="primary" onClick={()=>{setTeamSearch('');setSheet('teams')}}><Plus size={17}/>Lägg till lag</button></div>:
          loading&&!feed&&page!=='favorites'?<div className="loading-state" role="status"><RefreshCw size={24} className="spin"/><p>Hämtar matcher…</p></div>:
          visibleGames.length?sections.map(section=>{
            const [sectionDate,groupId]=section.split('|');const group=GROUPS.find(item=>item.id===groupId)!;
            const matches=visibleGames.filter(game=>game.date===sectionDate&&game.groupId===groupId);
            return <section className="match-section" key={section}>
              <h2 className="group-title"><span className="sweden-flag"/><span>{page==='favorites'?groupLabel(group):group.name}</span>{page==='favorites'&&<time>{dateLabel(sectionDate,{day:'numeric',month:'short'})}</time>}</h2>
              <div className="group-card">{matches.map(game=>{
                const stale=page==='favorites'&&!freshKeys.has(gameKey(game));
                const state=matchStatus(game,null,now,stale||!!error||!!feed?.failed.includes(game.group));
                return <div className="match-row" key={gameKey(game)}>
                  <button className="match-open" aria-label={`${game.home} mot ${game.away}, ${game.homeScore??'–'}–${game.awayScore??'–'}, ${state.label}${state.total?', '+state.total+' spelat':''}`} onClick={()=>openGame(game)}>
                    <CompactMatchStatus state={state}/>
                    <div className="match-teams">{[[game.home,game.homeScore],[game.away,game.awayScore]].map(([name,score])=><div className="team-score" key={name as string}><Crest name={name as string}/><span className={followsTeam(teams,name as string,game.groupId)?'followed-team':''}>{name as string}</span><b className={state.live?'live-score':''}>{score??'–'}</b></div>)}</div>
                  </button>
                  <button className={'star-button'+(isSaved(game)?' saved':'')} aria-label={(isSaved(game)?'Ta bort favoritmatch ':'Spara match ')+game.home+' mot '+game.away} aria-pressed={isSaved(game)} onClick={()=>toggleGame(game)}><Star size={21} fill={isSaved(game)?'currentColor':'none'}/></button>
                </div>;
              })}</div>
            </section>;
          }):!error&&<div className="empty-state"><div className={'empty-symbol'+(page==='live'?' red':'')}>{page==='live'?<Radio size={30}/>:page==='favorites'?<Star size={30}/>:<CalendarDays size={30}/>}</div><h2>{page==='live'?'Lugnt på isen just nu':page==='favorites'?'Dina matcher, ett tryck bort':query?'Inga matcher hittades':onlyFollowed?'Dina lag spelar inte idag':'Ingen match den här dagen'}</h2><p>{page==='live'?'Här dyker matcherna upp när pucken släpps.':page==='favorites'?'Tryck på stjärnan vid en match för att spara den.':query?'Prova ett annat lag eller välj en annan dag.':'Välj en annan dag för nästa nedsläpp.'}</p><div className="empty-actions">{page==='favorites'||page==='live'?<button className="primary" onClick={()=>navigate('matches')}>Visa matcher<ChevronRight size={16}/></button>:nextDate?<button className="primary" onClick={()=>setDate(nextDate)}>Nästa matchdag · {dateLabel(nextDate,{day:'numeric',month:'short'})}<ChevronRight size={16}/></button>:null}{page==='matches'&&previousDate&&<button className="text-button" onClick={()=>setDate(previousDate)}>Senaste resultaten</button>}</div></div>}

        {page!=='tables'&&<div className="sync-status" role="status"><span className={'sync-dot'+(error?' offline':'')}/>{loading?'Uppdaterar…':error?'Uppdatering misslyckades':feed?'Uppdaterat '+new Date(feed.checkedAt).toLocaleTimeString('sv-SE',{hour:'2-digit',minute:'2-digit',timeZone:'Europe/Stockholm'}):'Väntar på data'}<span className="sync-divider">·</span>30 s</div>}
      </main>

      <nav className="tab-bar" aria-label="Huvudnavigation">{([{id:'matches',name:'Matcher',icon:CalendarDays},{id:'live',name:'Live',icon:Radio},{id:'tables',name:'Statistik',icon:Trophy},{id:'favorites',name:'Favoriter',icon:Star}] as const).map(({id,name,icon:Icon})=><button key={id} aria-current={page===id?'page':undefined} className={page===id?'active':''} onClick={()=>navigate(id)}><span className="tab-icon"><Icon size={24} strokeWidth={page===id?2.2:1.7} fill={id==='favorites'&&page===id?'currentColor':'none'}/>{id==='live'&&activeDate===today()&&liveCount>0&&<i/>}</span><span>{name}</span></button>)}</nav>
    </div>

    {modalOpen&&<div className="overlay" onClick={closeModal}><section ref={modalRef} className={'sheet'+(currentGame?' match-sheet':'')} role="dialog" aria-modal="true" aria-label={player?'Spelarprofil':profile?'Lagprofil':currentGame?'Matchdetaljer':sheet==='teams'?'Välj favoritlag':sheet==='filters'?'Filtrera matcher':'Om TVÅAN'} onClick={e=>e.stopPropagation()}>
      <div className="sheet-handle"/>
      <div className="sheet-header"><h2>{player?'Spelarprofil':profile?'Lagprofil':currentGame?groupLabel(GROUPS.find(g=>g.id===currentGame.groupId)!):sheet==='teams'?'Lägg till lag':sheet==='filters'?'Visa matcher':'TVÅAN'}</h2><button className="icon-button close-button" aria-label="Stäng" onClick={closeModal}><X size={19}/></button></div>
      {player?<PlayerProfile initial={player} saved={favoritePlayers.some(item=>playerKey(item)===playerKey(player))} onToggle={togglePlayer} onTeam={openTeam}/>:profile?<TeamProfile team={profile.team} group={profile.group} followed={followsTeam(teams,profile.team,profile.group)} onFollow={()=>toggleTeam(profile.team,profile.group)} onGame={openGame} onPlayer={openPlayer}/>:currentGame?<>
        <div className="detail-date">{dateLabel(currentGame.date,{weekday:'short',day:'numeric',month:'long'})} · {currentGame.time}</div>
        <div className="detail-match"><div className="detail-team"><Crest name={currentGame.home} large/><h3><button className="profile-link" onClick={()=>openTeam(currentGame.home,currentGame.groupId)}>{currentGame.home}</button></h3><button aria-label={(followsTeam(teams,currentGame.home,currentGame.groupId)?'Sluta följa ':'Följ ')+currentGame.home} aria-pressed={followsTeam(teams,currentGame.home,currentGame.groupId)} className={'team-follow'+(followsTeam(teams,currentGame.home,currentGame.groupId)?' following':'')} onClick={()=>toggleTeam(currentGame.home,currentGame.groupId)}>{followsTeam(teams,currentGame.home,currentGame.groupId)?<Check size={14}/>:<Plus size={14}/>} {followsTeam(teams,currentGame.home,currentGame.groupId)?'Följer':'Följ lag'}</button></div><div className="detail-score"><span className={currentStatus?.live?'is-live':''}>{currentStatus?.label}</span><b>{currentStatus?.homeScore??currentGame.homeScore??'–'}<i>–</i>{currentStatus?.awayScore??currentGame.awayScore??'–'}</b></div><div className="detail-team"><Crest name={currentGame.away} large/><h3><button className="profile-link" onClick={()=>openTeam(currentGame.away,currentGame.groupId)}>{currentGame.away}</button></h3><button aria-label={(followsTeam(teams,currentGame.away,currentGame.groupId)?'Sluta följa ':'Följ ')+currentGame.away} aria-pressed={followsTeam(teams,currentGame.away,currentGame.groupId)} className={'team-follow'+(followsTeam(teams,currentGame.away,currentGame.groupId)?' following':'')} onClick={()=>toggleTeam(currentGame.away,currentGame.groupId)}>{followsTeam(teams,currentGame.away,currentGame.groupId)?<Check size={14}/>:<Plus size={14}/>} {followsTeam(teams,currentGame.away,currentGame.groupId)?'Följer':'Följ lag'}</button></div></div>
        <button className={'save-match'+(isSaved(currentGame)?' saved':'')} aria-pressed={isSaved(currentGame)} onClick={()=>toggleGame(currentGame)}><Star size={17} fill={isSaved(currentGame)?'currentColor':'none'}/>{isSaved(currentGame)?'Sparad match':'Spara match'}</button>
        <MatchClockPanel game={currentGame} detail={detail} now={now} unavailable={clockUnavailable}/>
        {(currentGame.periods||detail?.shots?.length===2)&&<div className="stats-card">{currentGame.periods&&<div><span>Perioder</span><b>{currentGame.periods.replace(/[()]/g,'')}</b></div>}{detail?.shots?.length===2&&<div><span>Skott på mål</span><b>{detail.shots[0]} – {detail.shots[1]}</b></div>}</div>}
        {detailError&&matchTab!=='events'&&<div className="notice error" role="alert"><p>{detailError}{detail?' Senast hämtad statistik visas.':''}</p></div>}<div className="segmented match-tabs">{[['events','Händelser'],['stats','Statistik'],['prediction','Prognos'],['history','Inbördes']].map(([id,name])=><button key={id} className={matchTab===id?'selected':''} aria-pressed={matchTab===id} onClick={()=>setMatchTab(id as typeof matchTab)}>{name}</button>)}</div>{matchTab==='prediction'?<MatchPredictions key={gameKey(currentGame)} game={currentGame} detail={detail} detailError={!!detailError}/>:matchTab==='stats'?<MatchStatistics detail={detail} game={currentGame}/>:matchTab==='history'?<MatchInsights game={currentGame} onGame={openGame}/>:<><div className="event-header"><h3>Händelser</h3><div className="event-switch">{[['all','Alla'],['goals','Mål']].map(([value,name])=><button className={eventFilter===value?'selected':''} aria-pressed={eventFilter===value} key={value} onClick={()=>setEventFilter(value as 'all'|'goals')}>{name}</button>)}</div></div>
        {detailError&&<div className="notice error" role="alert"><Info size={17}/><p>{detailError}{detail?' Senast hämtade händelser visas.':''}</p></div>}
        <div className="events">{!eventId?<p className="quiet-text">Händelser visas när matchen börjar rapporteras.</p>:!detail&&!detailError?<div className="detail-loading"><RefreshCw size={18} className="spin"/>Hämtar händelser…</div>:detail?.events?.filter(e=>eventFilter==='all'||/\d+\s*-\s*\d+/.test(e.type)).length?detail.events.filter(e=>eventFilter==='all'||/\d+\s*-\s*\d+/.test(e.type)).map((event,index)=><div className="event" key={index}><time>{event.time}</time><span className={'event-type'+(/\d+\s*-\s*\d+/.test(event.type)?' goal':'')}>{event.type}</span><div><b>{event.team}</b><p>{event.detail}</p></div></div>):!detailError&&<p className="quiet-text">{eventFilter==='goals'?'Inga mål har rapporterats.':'Inga händelser har rapporterats ännu.'}</p>}</div>
        </>}<div className="match-footnote">{currentGame.venue&&<p>{currentGame.venue}</p>}{detail?.sourceUpdated&&<p>Rapporterat {detail.sourceUpdated}</p>}<a href={eventId?'https://stats.swehockey.se/Game/Events/'+eventId:'https://stats.swehockey.se/ScheduleAndResults/Schedule/'+currentGame.groupId} target="_blank" rel="noreferrer">Öppna hos Swehockey <ArrowUpRight size={13}/></a></div>
      </>:sheet==='teams'?<>
        <label className="search-field sheet-search"><Search size={18}/><input autoFocus type="search" aria-label="Sök favoritlag" placeholder="Sök ditt lag" value={teamSearch} onChange={e=>setTeamSearch(e.target.value)}/></label>
        <div className="team-picker">{allTeams.filter(team=>team.toLowerCase().includes(teamSearch.toLowerCase())).map(team=>{const group=feed?.teamGroups?.[team];const following=group?followsTeam(teams,team,group):teams.includes(team);return <button disabled={!group} key={team} className="pick-team" aria-label={(following?'Sluta följa ':'Följ ')+team} aria-pressed={following} onClick={()=>group&&toggleTeam(team,group)}><Crest name={team}/><span>{team}</span><Star size={21} className={following?'saved':''} fill={following?'currentColor':'none'}/></button>})}{!allTeams.length&&<p className="quiet-text">{loading?'Hämtar lag…':'Laglistan kunde inte hämtas. Stäng och försök uppdatera.'}</p>}{allTeams.length>0&&!allTeams.some(team=>team.toLowerCase().includes(teamSearch.toLowerCase()))&&<p className="quiet-text">Inga lag matchar sökningen.</p>}</div>
      </>:sheet==='filters'?<div className="filter-options"><h3>Region</h3><div className="filter-list">{regionChoices.map(item=><button aria-pressed={region===item} key={item} onClick={()=>setRegion(item)}><span>{item==='Alla'?'Hela Sverige':'Region '+item}</span>{region===item&&<Check size={20}/>}</button>)}</div><h3>Lag</h3><button className="toggle-row" role="switch" aria-checked={onlyFollowed} onClick={()=>setOnlyFollowed(!onlyFollowed)}><span>Endast mina lag</span><span className={'toggle'+(onlyFollowed?' on':'')}><i/></span></button><button className="primary done-button" onClick={()=>setSheet(null)}>Visa matcher</button></div>:
      <div className="about-content"><h4 className="appearance-heading">Utseende</h4><ThemePicker theme={theme} onChange={setTheme}/><div className="app-icon">II</div><h3>Svensk hockey. I fickan.</h3><p>Matcher, liveresultat, spelarprofiler och dina favoriter. Alla sex herrnivåer från SHL till Hockeyfyran, plus SDHL, NDHL och Damtvåan. 36 seriegrupper under säsongen 2026/27.</p><h4>Mer än resultat</h4><p>Jämför spelare, följ poängligor och utforska lagens powerplay, boxplay och publik. Spelarprofiler kan ha porträtt, matchlogg och karriärstatistik från både svenska och utländska ligor. I Karriär finns ligafilter, summeringar och lag per säsong. NHL-data kan komplettera med nordamerikanska säsonger, karriärsummor, draft och utmärkelser. I matchens Statistik finns publicerade laguppställningar och domare. Historiken kan vara ofullständig och exakta övergångsdatum ingår inte.</p><h4>Matchprognoser</h4><p>I matchens Prognos-flik finns uppskattad vinstchans efter 60 minuter, nästa mål och förväntade mål. Samma modell används i alla serier. Livevärden kräver en färsk rapporterad klocka; tidiga serier kan sakna tillräckligt matchunderlag.</p><h4>Lägg till på hemskärmen</h4><p>Öppna appen i Safari på din iPhone. Tryck på Dela och välj Lägg till på hemskärmen.</p><h4>Live & favoriter</h4><p>Resultat och händelser hämtas från Swehockey var 30:e sekund när appen är öppen och synlig. Matchlistan och matchvyn visar rapporterad period, speltid och periodpaus. Klockan visar källans senaste uppgift och tickar inte fram mellan rapporterna. Rapporteringen kan vara fördröjd. Favoritlag, matcher och spelare sparas på den här enheten. Tillgängliga uppgifter varierar mellan serierna. Pushnotiser ingår inte.</p><a className="about-source" href="https://stats.swehockey.se" target="_blank" rel="noreferrer">Statistik från Swehockey <ArrowUpRight size={15}/></a><p className="fine-print">Fristående app med en egen feed från Swehockeys officiella sidor.</p></div>}
    </section></div>}
  </>;
}

