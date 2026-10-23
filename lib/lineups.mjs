import {text,parseEvents} from './hockey.mjs';
import {displayName} from './players.mjs';

export function parseLineups(html){
 const detail=parseEvents(html),markers=[...html.matchAll(/<h3\b[^>]*>([\s\S]*?)<\/h3>/gi)].filter(m=>[detail.home,detail.away].some(team=>text(m[1]).replace(/\s*\([^)]*\)\s*$/,'').trim()===team));
 if(markers.length!==2)throw new Error('Lineups not published or format unrecognized');
 const teams=markers.map((marker,i)=>{
  const name=text(marker[1]).replace(/\s*\([^)]*\)\s*$/,'').trim(),part=html.slice(marker.index+marker[0].length,markers[i+1]?.index||html.length);
  const groups=[...part.matchAll(/<strong>\s*(Goalies|[1-4](?:st|nd|rd|th) Line|Extra Players)\s*<\/strong>/gi)];
  const units=groups.map((group,index)=>{
   const raw=group[1],label=/Goalies/i.test(raw)?'Målvakter':/Extra Players/i.test(raw)?'Extra spelare':'Femman '+raw[0];
   const section=part.slice(group.index+group[0].length,groups[index+1]?.index||part.length);
   const players=[...section.matchAll(/<div\b[^>]*class="[^"]*\blineUpPlayer\b[^"]*"[^>]*>([\s\S]*?)<\/div>/gi)].flatMap(match=>{
    const value=text(match[1]),p=value.match(/^(\d{1,3})\.\s*(.+?)(?:\s*\(([A-Z]{1,3})\))?$/);
    return p?[{jersey:p[1],sourceName:p[2],name:displayName(p[2]),position:p[3]||null}]:[];
   });
   return {label,players};
  }).filter(unit=>unit.players.length).sort((a,b)=>{const rank=label=>label==='Målvakter'?0:label==='Extra spelare'?9:Number(label.slice(-1));return rank(a.label)-rank(b.label)});
  const coaches=[...part.matchAll(/<strong>\s*(Head Coach|Assistant Coach):\s*<\/strong>([\s\S]*?)<\/td>/gi)].map(m=>({role:/^Head/i.test(m[1])?'Huvudtränare':'Assisterande tränare',name:displayName(text(m[2]))}));
  return {team:name,units,coaches};
 });
 if(teams.some(team=>!team.units.length))throw new Error('Incomplete lineups');
 const officials=label=>text(html.match(new RegExp('<strong>\\s*'+label+'\\s*<\\/strong>\\s*<\\/td>\\s*<td\\b[^>]*>([\\s\\S]*?)<\\/td>','i'))?.[1]||'');
 return {home:detail.home,away:detail.away,teams,referees:officials('Referee\\(s\\)'),linesmen:officials('Linesmen'),sourceUpdated:detail.sourceUpdated};
}
