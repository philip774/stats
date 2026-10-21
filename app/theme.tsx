'use client';
import {useEffect,useState} from 'react';
import {Moon,Sun,Monitor} from 'lucide-react';
export type Theme='system'|'light'|'dark';
export function useTheme(){
  const [theme,setTheme]=useState<Theme>('system');
  const [dark,setDark]=useState(false);
  const [ready,setReady]=useState(false);
  useEffect(()=>{try{const saved=localStorage.getItem('tvaan-theme');if(saved==='light'||saved==='dark')setTheme(saved)}catch{}setReady(true)},[]);
  useEffect(()=>{
    if(!ready)return;
    const media=window.matchMedia('(prefers-color-scheme: dark)');
    const apply=()=>{const value=theme==='system'?(media.matches?'dark':'light'):theme;document.documentElement.dataset.theme=value;setDark(value==='dark');document.querySelectorAll('meta[name="theme-color"]').forEach(meta=>meta.setAttribute('content',value==='dark'?'#101116':'#f2f2f7'))};
    apply();try{localStorage.setItem('tvaan-theme',theme)}catch{}
    media.addEventListener('change',apply);return()=>media.removeEventListener('change',apply);
  },[theme,ready]);
  return {theme,setTheme,dark};
}
export function ThemePicker({theme,onChange}:{theme:Theme;onChange:(theme:Theme)=>void}){
  return <div className="theme-picker" aria-label="Utseende">{([{id:'light',label:'Ljust',icon:Sun},{id:'dark',label:'Mörkt',icon:Moon},{id:'system',label:'System',icon:Monitor}] as const).map(({id,label,icon:Icon})=><button key={id} className={theme===id?'selected':''} aria-pressed={theme===id} onClick={()=>onChange(id)}><Icon size={19}/><span>{label}</span></button>)}</div>;
}
