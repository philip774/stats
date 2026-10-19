'use client';

import {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {ArrowUpRight, CalendarDays, Check, ChevronDown, ChevronLeft, ChevronRight, Info, Plus, Radio, RefreshCw, Search, SlidersHorizontal, Star, Users, X} from 'lucide-react';
import {gameKey, mergeSavedGames, readFavoriteTeams, readSavedGames, toggleSavedGame} from '../lib/favorites.mjs';

type Game = {
  id:string; eventId?:string; date:string; time:string; home:string; away:string;
  homeScore:number|null; awayScore:number|null; periods:string; venue:string;
  groupId:string; group:string; region:string; status:string;
};
type Feed = {games:Game[]; dates:string[]; teams:string[]; failed:string[]; checkedAt:string; error?:string};
type Detail = {homeScore:number|null; awayScore:number|null; status:string; label:string; shots:number[]; events:{time:string;type:string;team:string;detail:string}[]; sourceUpdated:string|null; error?:string};
type Page = 'matches'|'live'|'favorites';
type Sheet = 'teams'|'filters'|'about'|null;
const today = () => new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Stockholm'}).format(new Date());
const shift = (date:string, n:number) => {const d=new Date(date+'T12:00:00Z'); d.setUTCDate(d.getUTCDate()+n); return d.toISOString().slice(0,10)};
const dateLabel = (date:string, options:Intl.DateTimeFormatOptions) => new Date(date+'T12:00:00Z').toLocaleDateString('sv-SE',options);
const initials = (name:string) => name.replace(/\b(IF|IK|HC|SK|HK|IS|GIK)\b/g,'').trim().split(/\s+/).map(s=>s[0]).join('').slice(0,2).toUpperCase();
const statusLabel = (game:Game) => game.status==='live'?'Live':game.status==='finished'?'Slut':game.status==='reported'?'Resultat':game.time;

function Crest({name, large=false}:{name:string;large?:boolean}) {
  const hue = [...name].reduce((n,c)=>n+c.charCodeAt(0),0)%360;
  return <span aria-hidden="true" className={'crest'+(large?' large':'')} style={{'--h':hue} as React.CSSProperties}>{initials(name)}</span>;
}

export default function Matchcenter() {
  const [page,setPage]=useState<Page>('matches');
  const [date,setDate]=useState(today);
  const [region,setRegion]=useState('Alla');
  const [query,setQuery]=useState('');
  const [searchOpen,setSearchOpen]=useState(false);
  const [onlyFollowed,setOnlyFollowed]=useState(false);
  const [favoriteTab,setFavoriteTab]=useState<'games'|'teams'>('games');
  const [teams,setTeams]=useState<string[]>([]);
  const [saved,setSaved]=useState<Game[]>([]);
  const [storageReady,setStorageReady]=useState(false);
  const [feed,setFeed]=useState<Feed|null>(null);
  const [extraGames,setExtraGames]=useState<Game[]>([]);
  const [extraFailed,setExtraFailed]=useState(false);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState('');
  const [selected,setSelected]=useState<Game|null>(null);
  const [detail,setDetail]=useState<Detail|null>(null);
  const [detailError,setDetailError]=useState('');
  const [sheet,setSheet]=useState<Sheet>(null);
  const [teamSearch,setTeamSearch]=useState('');
  const [eventFilter,setEventFilter]=useState<'all'|'goals'>('all');
  const savedRef=useRef<Game[]>([]);
  const requestRef=useRef<AbortController|null>(null);
  const modalRef=useRef<HTMLElement|null>(null);
  const activeDate=page==='live'?today():date;
  const savedDates=useMemo(()=>[...new Set(saved.map(g=>g.date))].sort().join(','),[saved]);
  const favoriteDates=page==='favorites'&&favoriteTab==='games'?savedDates:'';

  useEffect(()=>{
    try {setTeams(readFavoriteTeams(localStorage.getItem('tvaan-favorites'))); setSaved(readSavedGames(localStorage.getItem('tvaan-games-v1')))} catch {}
    setStorageReady(true);
  },[]);
  useEffect(()=>{savedRef.current=saved; if(storageReady)try{localStorage.setItem('tvaan-games-v1',JSON.stringify(saved))}catch{}},[saved,storageReady]);
  useEffect(()=>{if(storageReady)try{localStorage.setItem('tvaan-favorites',JSON.stringify(teams))}catch{}},[teams,storageReady]);

  const refresh=useCallback(async()=>{
    requestRef.current?.abort();
    const controller=new AbortController(); requestRef.current=controller;
    setLoading(true);
    try {
      const dates=page==='favorites'&&favoriteTab==='games'?[...new Set([activeDate,...savedRef.current.map(g=>g.date)])]:[activeDate];
      const responses=await Promise.allSettled(dates.map(async d=>{
        const response=await fetch('/api/games?date='+d,{signal:controller.signal});
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
  },[activeDate,page,favoriteTab]);

  useEffect(()=>{setFeed(null);setExtraGames([]);setError('')},[activeDate]);

  useEffect(()=>{
    refresh();
    const timer=setInterval(()=>{if(document.visibilityState==='visible')refresh()},30000);
    const visible=()=>{if(document.visibilityState==='visible')refresh()};
    document.addEventListener('visibilitychange',visible);
    return()=>{clearInterval(timer);requestRef.current?.abort();document.removeEventListener('visibilitychange',visible)};
  },[refresh,favoriteDates]);

  const currentGame=selected?([...extraGames,...(feed?.games||[])].find(g=>gameKey(g)===gameKey(selected))||saved.find(g=>gameKey(g)===gameKey(selected))||selected):null;
  const eventId=currentGame?.eventId;
  useEffect(()=>{
    setDetail(null); setDetailError(''); setEventFilter('all');
    if(!eventId)return;
    const controller=new AbortController();
    async function load() {
      try {
        const response=await fetch('/api/game?id='+eventId,{signal:controller.signal});
        const result=await response.json() as Detail;
        if(!response.ok)throw new Error(result.error||'Matchhändelser kunde inte hämtas.');
        if(!controller.signal.aborted){setDetail(result);setDetailError('')}
      } catch(e) {if(!controller.signal.aborted)setDetailError((e as Error).message)}
    }
    load();
    const timer=setInterval(()=>{if(document.visibilityState==='visible')load()},30000);
    const visible=()=>{if(document.visibilityState==='visible')load()};
    document.addEventListener('visibilitychange',visible);
    return()=>{controller.abort();clearInterval(timer);document.removeEventListener('visibilitychange',visible)};
  },[eventId]);

  const modalOpen=!!currentGame||!!sheet;
  useEffect(()=>{
    if(!modalOpen)return;
    const previousFocus=document.activeElement as HTMLElement|null;
    const oldOverflow=document.body.style.overflow;
    document.body.style.overflow='hidden';
    const panel=modalRef.current;
    panel?.querySelector<HTMLElement>('button')?.focus();
    const key=(event:KeyboardEvent)=>{
      if(event.key==='Escape'){setSelected(null);setSheet(null)}
      if(event.key!=='Tab'||!panel)return;
      const elements=[...panel.querySelectorAll<HTMLElement>('button:not(:disabled),a[href],input,select')].filter(el=>el.getClientRects().length>0);
      const first=elements[0],last=elements.at(-1);
      if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus()}
      else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus()}
    };
    document.addEventListener('keydown',key);
    return()=>{document.body.style.overflow=oldOverflow;document.removeEventListener('keydown',key);previousFocus?.focus()};
  },[modalOpen]);

  function toggleTeam(team:string){setTeams(old=>old.includes(team)?old.filter(t=>t!==team):[...old,team])}
  function toggleGame(game:Game){setSaved(old=>toggleSavedGame(old,game))}
  function navigate(next:Page){setPage(next);setQuery('');setSearchOpen(false);window.scrollTo({top:0,behavior:'smooth'})}
  function closeModal(){setSelected(null);setSheet(null)}
  const isSaved=(game:Game)=>saved.some(item=>gameKey(item)===gameKey(game));
  const followed=(game:Game)=>teams.includes(game.home)||teams.includes(game.away);
  const freshKeys=new Set(extraGames.map(gameKey));
  const visibleGames=(page==='favorites'?saved:feed?.games||[])
    .filter(game=>(page!=='live'||game.status==='live')&&(page==='favorites'||region==='Alla'||game.region===region)&&(!onlyFollowed||page!=='matches'||followed(game))&&(!query||(game.home+' '+game.away).toLowerCase().includes(query.toLowerCase())))
    .sort((a,b)=>Number(b.status==='live')-Number(a.status==='live')||a.date.localeCompare(b.date)||a.time.localeCompare(b.time));
  const sections=[...new Set(visibleGames.map(g=>g.date+'|'+g.group))];
  const liveCount=(feed?.games||[]).filter(game=>game.status==='live').length;
  const nextDate=feed?.dates.find(d=>d>activeDate);
  const previousDate=feed?.dates.filter(d=>d<activeDate).at(-1);
  const allTeams=[...new Set([...(feed?.teams||[]),...teams])].sort((a,b)=>Number(teams.includes(b))-Number(teams.includes(a))||a.localeCompare(b,'sv'));
  const title=page==='matches'?'Matcher':page==='live'?'Live':'Favoriter';
  const subtitle=page==='favorites'?`${saved.length} ${saved.length===1?'match':'matcher'} · ${teams.length} lag`:dateLabel(activeDate,{weekday:'long',day:'numeric',month:'long'});

  return <>
    <div className="phone-app">
      <header className="app-header">
        <div className="top-line"><a href="/" className="wordmark" aria-label="TVÅAN startsida"><span className="puck-mark">II</span>TVÅAN<span className="league-name">HOCKEYTVÅAN</span></a><button className="icon-button subtle" aria-label="Om appen" onClick={()=>setSheet('about')}><Info size={20}/></button></div>
        <div className="title-line"><div><h1>{title}{page==='live'&&<span className="title-live-dot"/>}</h1><p className="subtitle">{subtitle}</p></div><div className="header-actions">{page!=='favorites'&&<button aria-label={searchOpen?'Stäng sökning':'Sök matcher'} className="icon-button" onClick={()=>{setSearchOpen(!searchOpen);setQuery('')}}>{searchOpen?<X size={21}/>:<Search size={21}/>}</button>}<button className="icon-button" disabled={loading} aria-label="Uppdatera matcher" onClick={refresh}><RefreshCw size={20} className={loading?'spin':''}/></button></div></div>
        {searchOpen&&<label className="search-field"><Search size={18}/><input autoFocus type="search" aria-label="Sök lag eller match" placeholder="Sök lag eller match" value={query} onChange={e=>setQuery(e.target.value)}/></label>}
        {page==='matches'&&<div className="date-navigation"><button className="icon-button" aria-label="Föregående dag" onClick={()=>setDate(shift(date,-1))}><ChevronLeft size={21}/></button><div className="date-days">{[-2,-1,0,1,2].map(n=>{const d=shift(date,n);return <button key={d} aria-pressed={n===0} className={n===0?'selected':''} onClick={()=>setDate(d)}><span>{d===today()?'Idag':dateLabel(d,{weekday:'short'}).replace('.','')}</span><b>{dateLabel(d,{day:'numeric'})}</b><i className={feed?.dates.includes(d)?'has-games':''}/></button>})}</div><label className="calendar-button" title="Välj datum"><CalendarDays size={20}/><input type="date" aria-label="Välj datum" value={date} onChange={e=>e.target.value&&setDate(e.target.value)}/></label></div>}
        {page==='favorites'&&<div className="segmented" aria-label="Favorittyp">{[['games','Matcher'],['teams','Lag']].map(([value,name])=><button key={value} aria-pressed={favoriteTab===value} className={favoriteTab===value?'selected':''} onClick={()=>setFavoriteTab(value as 'games'|'teams')}>{name}</button>)}</div>}
      </header>

      <main>
        <div className="list-toolbar">
          <span>{page==='live'?`${liveCount} pågående matcher`:page==='favorites'?(favoriteTab==='games'?'SPARADE MATCHER':'MINA LAG'):region==='Alla'?'ALLA REGIONER':'REGION '+region.toUpperCase()}</span>
          {page==='matches'?<div className="toolbar-actions">{date!==today()&&<button onClick={()=>setDate(today())}>Idag</button>}<button className={onlyFollowed?'filter-active':''} aria-label="Filtrera matcher" onClick={()=>setSheet('filters')}><SlidersHorizontal size={16}/>{onlyFollowed?'Mina lag':'Filter'}<ChevronDown size={12}/></button></div>:page==='favorites'&&favoriteTab==='teams'?<button className="add-team" onClick={()=>{setTeamSearch('');setSheet('teams')}}><Plus size={17}/>Lägg till</button>:null}
        </div>
        {error&&<div className="notice error" role="alert"><Info size={18}/><div><b>Kunde inte uppdatera</b><p>{feed||page==='favorites'?'Senast sparade uppgifter visas. ':''}{error}</p></div><button aria-label="Försök igen" onClick={refresh}><RefreshCw size={18}/></button></div>}
        {!error&&!!feed?.failed.length&&<div className="notice"><Info size={17}/><p>Rapporteringen är tillfälligt otillgänglig i {feed.failed.join(', ')}.</p></div>}
        {page==='favorites'&&favoriteTab==='games'&&extraFailed&&!error&&<div className="notice"><Info size={17}/><p>Vissa sparade matcher kunde inte uppdateras. Senast sparade uppgifter visas.</p></div>}

        {page==='favorites'&&favoriteTab==='teams'?
          teams.length?<div className="group-card team-list">{[...teams].sort((a,b)=>a.localeCompare(b,'sv')).map(team=><div className="team-row" key={team}><button className="team-open" aria-label={'Visa matcher för '+team} onClick={()=>{navigate('matches');setOnlyFollowed(false);setQuery(team);setSearchOpen(true)}}><Crest name={team}/><span>{team}</span><ChevronRight size={16}/></button><button className="star-button saved" aria-label={'Sluta följa '+team} aria-pressed onClick={()=>toggleTeam(team)}><Star size={21} fill="currentColor"/></button></div>)}</div>:
          <div className="empty-state"><div className="empty-symbol"><Users size={30}/></div><h2>Vilket är ditt lag?</h2><p>Följ dina lag och hitta deras matcher snabbt.</p><button className="primary" onClick={()=>{setTeamSearch('');setSheet('teams')}}><Plus size={17}/>Lägg till lag</button></div>:
          loading&&!feed&&page!=='favorites'?<div className="loading-state" role="status"><RefreshCw size={24} className="spin"/><p>Hämtar matcher…</p></div>:
          visibleGames.length?sections.map(section=>{
            const [sectionDate,group]=section.split('|');
            const matches=visibleGames.filter(game=>game.date===sectionDate&&game.group===group);
            return <section className="match-section" key={section}>
              <h2 className="group-title"><span className="sweden-flag"/><span>{group}</span>{page==='favorites'&&<time>{dateLabel(sectionDate,{day:'numeric',month:'short'})}</time>}</h2>
              <div className="group-card">{matches.map(game=>{
                const stale=page==='favorites'&&!freshKeys.has(gameKey(game));
                return <div className="match-row" key={gameKey(game)}>
                  <button className="match-open" aria-label={`${game.home} mot ${game.away}, ${game.homeScore??'–'}–${game.awayScore??'–'}, ${stale?'senast sparat':statusLabel(game)}`} onClick={()=>setSelected(game)}>
                    <div className={'match-status'+(game.status==='live'&&!stale?' is-live':'')}>{game.status==='live'&&!stale&&<span className="live-dot"/>}<b>{stale&&game.status==='live'?'Sparad':statusLabel(game)}</b>{game.status==='live'&&!stale?<small>Pågår</small>:game.status!=='scheduled'?<small>{game.time}</small>:null}</div>
                    <div className="match-teams">{[[game.home,game.homeScore],[game.away,game.awayScore]].map(([name,score])=><div className="team-score" key={name as string}><Crest name={name as string}/><span className={teams.includes(name as string)?'followed-team':''}>{name as string}</span><b className={game.status==='live'&&!stale?'live-score':''}>{score??'–'}</b></div>)}</div>
                  </button>
                  <button className={'star-button'+(isSaved(game)?' saved':'')} aria-label={(isSaved(game)?'Ta bort favoritmatch ':'Spara match ')+game.home+' mot '+game.away} aria-pressed={isSaved(game)} onClick={()=>toggleGame(game)}><Star size={21} fill={isSaved(game)?'currentColor':'none'}/></button>
                </div>;
              })}</div>
            </section>;
          }):!error&&<div className="empty-state"><div className={'empty-symbol'+(page==='live'?' red':'')}>{page==='live'?<Radio size={30}/>:page==='favorites'?<Star size={30}/>:<CalendarDays size={30}/>}</div><h2>{page==='live'?'Lugnt på isen just nu':page==='favorites'?'Dina matcher, ett tryck bort':query?'Inga matcher hittades':onlyFollowed?'Dina lag spelar inte idag':'Ingen match den här dagen'}</h2><p>{page==='live'?'Här dyker matcherna upp när pucken släpps.':page==='favorites'?'Tryck på stjärnan vid en match för att spara den.':query?'Prova ett annat lag eller välj en annan dag.':'Välj en annan dag för nästa nedsläpp.'}</p><div className="empty-actions">{page==='favorites'||page==='live'?<button className="primary" onClick={()=>navigate('matches')}>Visa matcher<ChevronRight size={16}/></button>:nextDate?<button className="primary" onClick={()=>setDate(nextDate)}>Nästa matchdag · {dateLabel(nextDate,{day:'numeric',month:'short'})}<ChevronRight size={16}/></button>:null}{page==='matches'&&previousDate&&<button className="text-button" onClick={()=>setDate(previousDate)}>Senaste resultaten</button>}</div></div>}

        <div className="sync-status" role="status"><span className={'sync-dot'+(error?' offline':'')}/>{loading?'Uppdaterar…':error?'Uppdatering misslyckades':feed?'Uppdaterat '+new Date(feed.checkedAt).toLocaleTimeString('sv-SE',{hour:'2-digit',minute:'2-digit',timeZone:'Europe/Stockholm'}):'Väntar på data'}<span className="sync-divider">·</span>30 s</div>
      </main>

      <nav className="tab-bar" aria-label="Huvudnavigation">{([{id:'matches',name:'Matcher',icon:CalendarDays},{id:'live',name:'Live',icon:Radio},{id:'favorites',name:'Favoriter',icon:Star}] as const).map(({id,name,icon:Icon})=><button key={id} aria-current={page===id?'page':undefined} className={page===id?'active':''} onClick={()=>navigate(id)}><span className="tab-icon"><Icon size={24} strokeWidth={page===id?2.2:1.7} fill={id==='favorites'&&page===id?'currentColor':'none'}/>{id==='live'&&activeDate===today()&&liveCount>0&&<i/>}</span><span>{name}</span></button>)}</nav>
    </div>

    {modalOpen&&<div className="overlay" onClick={closeModal}><section ref={modalRef} className={'sheet'+(currentGame?' match-sheet':'')} role="dialog" aria-modal="true" aria-label={currentGame?'Matchdetaljer':sheet==='teams'?'Välj favoritlag':sheet==='filters'?'Filtrera matcher':'Om TVÅAN'} onClick={e=>e.stopPropagation()}>
      <div className="sheet-handle"/>
      <div className="sheet-header"><h2>{currentGame?'Hockeytvåan · '+currentGame.group:sheet==='teams'?'Lägg till lag':sheet==='filters'?'Visa matcher':'TVÅAN'}</h2><button className="icon-button close-button" aria-label="Stäng" onClick={closeModal}><X size={19}/></button></div>
      {currentGame?<>
        <div className="detail-date">{dateLabel(currentGame.date,{weekday:'short',day:'numeric',month:'long'})} · {currentGame.time}</div>
        <div className="detail-match"><div className="detail-team"><Crest name={currentGame.home} large/><h3>{currentGame.home}</h3><button aria-label={(teams.includes(currentGame.home)?'Sluta följa ':'Följ ')+currentGame.home} aria-pressed={teams.includes(currentGame.home)} className={'team-follow'+(teams.includes(currentGame.home)?' following':'')} onClick={()=>toggleTeam(currentGame.home)}>{teams.includes(currentGame.home)?<Check size={14}/>:<Plus size={14}/>} {teams.includes(currentGame.home)?'Följer':'Följ lag'}</button></div><div className="detail-score"><span className={(detail?.status||currentGame.status)==='live'?'is-live':''}>{detail?.label||statusLabel(currentGame)}</span><b>{detail?.homeScore??currentGame.homeScore??'–'}<i>–</i>{detail?.awayScore??currentGame.awayScore??'–'}</b></div><div className="detail-team"><Crest name={currentGame.away} large/><h3>{currentGame.away}</h3><button aria-label={(teams.includes(currentGame.away)?'Sluta följa ':'Följ ')+currentGame.away} aria-pressed={teams.includes(currentGame.away)} className={'team-follow'+(teams.includes(currentGame.away)?' following':'')} onClick={()=>toggleTeam(currentGame.away)}>{teams.includes(currentGame.away)?<Check size={14}/>:<Plus size={14}/>} {teams.includes(currentGame.away)?'Följer':'Följ lag'}</button></div></div>
        <button className={'save-match'+(isSaved(currentGame)?' saved':'')} aria-pressed={isSaved(currentGame)} onClick={()=>toggleGame(currentGame)}><Star size={17} fill={isSaved(currentGame)?'currentColor':'none'}/>{isSaved(currentGame)?'Sparad match':'Spara match'}</button>
        {(currentGame.periods||detail?.shots?.length===2)&&<div className="stats-card">{currentGame.periods&&<div><span>Perioder</span><b>{currentGame.periods.replace(/[()]/g,'')}</b></div>}{detail?.shots?.length===2&&<div><span>Skott på mål</span><b>{detail.shots[0]} – {detail.shots[1]}</b></div>}</div>}
        <div className="event-header"><h3>Händelser</h3><div className="event-switch">{[['all','Alla'],['goals','Mål']].map(([value,name])=><button className={eventFilter===value?'selected':''} aria-pressed={eventFilter===value} key={value} onClick={()=>setEventFilter(value as 'all'|'goals')}>{name}</button>)}</div></div>
        {detailError&&<div className="notice error" role="alert"><Info size={17}/><p>{detailError}{detail?' Senast hämtade händelser visas.':''}</p></div>}
        <div className="events">{!eventId?<p className="quiet-text">Händelser visas när matchen börjar rapporteras.</p>:!detail&&!detailError?<div className="detail-loading"><RefreshCw size={18} className="spin"/>Hämtar händelser…</div>:detail?.events?.filter(e=>eventFilter==='all'||/\d+\s*-\s*\d+/.test(e.type)).length?detail.events.filter(e=>eventFilter==='all'||/\d+\s*-\s*\d+/.test(e.type)).map((event,index)=><div className="event" key={index}><time>{event.time}</time><span className={'event-type'+(/\d+\s*-\s*\d+/.test(event.type)?' goal':'')}>{event.type}</span><div><b>{event.team}</b><p>{event.detail}</p></div></div>):!detailError&&<p className="quiet-text">{eventFilter==='goals'?'Inga mål har rapporterats.':'Inga händelser har rapporterats ännu.'}</p>}</div>
        <div className="match-footnote">{currentGame.venue&&<p>{currentGame.venue}</p>}{detail?.sourceUpdated&&<p>Rapporterat {detail.sourceUpdated}</p>}<a href={eventId?'https://stats.swehockey.se/Game/Events/'+eventId:'https://stats.swehockey.se/ScheduleAndResults/Schedule/'+currentGame.groupId} target="_blank" rel="noreferrer">Öppna hos Swehockey <ArrowUpRight size={13}/></a></div>
      </>:sheet==='teams'?<>
        <label className="search-field sheet-search"><Search size={18}/><input autoFocus type="search" aria-label="Sök favoritlag" placeholder="Sök ditt lag" value={teamSearch} onChange={e=>setTeamSearch(e.target.value)}/></label>
        <div className="team-picker">{allTeams.filter(team=>team.toLowerCase().includes(teamSearch.toLowerCase())).map(team=><button key={team} className="pick-team" aria-label={(teams.includes(team)?'Sluta följa ':'Följ ')+team} aria-pressed={teams.includes(team)} onClick={()=>toggleTeam(team)}><Crest name={team}/><span>{team}</span><Star size={21} className={teams.includes(team)?'saved':''} fill={teams.includes(team)?'currentColor':'none'}/></button>)}{allTeams.length===0&&<p className="quiet-text">{loading?'Hämtar lag…':'Laglistan kunde inte hämtas. Stäng och försök uppdatera.'}</p>}{allTeams.length>0&&!allTeams.some(team=>team.toLowerCase().includes(teamSearch.toLowerCase()))&&<p className="quiet-text">Inga lag matchar sökningen.</p>}</div>
      </>:sheet==='filters'?<div className="filter-options"><h3>Region</h3><div className="filter-list">{['Alla','Syd','Väst','Öst','Norr'].map(item=><button aria-pressed={region===item} key={item} onClick={()=>setRegion(item)}><span>{item==='Alla'?'Hela Sverige':'Region '+item}</span>{region===item&&<Check size={20}/>}</button>)}</div><h3>Lag</h3><button className="toggle-row" role="switch" aria-checked={onlyFollowed} onClick={()=>setOnlyFollowed(!onlyFollowed)}><span>Endast mina lag</span><span className={'toggle'+(onlyFollowed?' on':'')}><i/></span></button><button className="primary done-button" onClick={()=>setSheet(null)}>Visa matcher</button></div>:
      <div className="about-content"><div className="app-icon">II</div><h3>Hockeytvåan. I fickan.</h3><p>Matcher, liveresultat och dina favoriter. Nio grupper i hela Sverige, säsongen 2026/27.</p><h4>Lägg till på hemskärmen</h4><p>Öppna appen i Safari på din iPhone. Tryck på Dela och välj Lägg till på hemskärmen.</p><h4>Live & favoriter</h4><p>Resultat och händelser hämtas från Swehockey var 30:e sekund när appen är öppen och synlig. Rapporteringen kan vara fördröjd. Lag och matcher sparas på den här enheten. Pushnotiser ingår inte.</p><a className="about-source" href="https://stats.swehockey.se" target="_blank" rel="noreferrer">Statistik från Swehockey <ArrowUpRight size={15}/></a><p className="fine-print">Fristående app med en egen feed från Swehockeys officiella sidor.</p></div>}
    </section></div>}
  </>;
}

