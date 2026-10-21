import type {Metadata, Viewport} from 'next';
import './globals.css';
export const metadata:Metadata={title:'TVÅAN',description:'Följ Hockeytvåan live. Tabeller, lagstatistik och dina favoriter.',manifest:'/manifest.webmanifest',icons:{icon:'/favicon.svg',apple:'/apple-touch-icon.png'},appleWebApp:{capable:true,title:'TVÅAN',statusBarStyle:'default'}};
export const viewport:Viewport={width:'device-width',initialScale:1,viewportFit:'cover',themeColor:[{media:'(prefers-color-scheme: light)',color:'#f2f2f7'},{media:'(prefers-color-scheme: dark)',color:'#101116'}]};
const themeScript="try{var t=localStorage.getItem('tvaan-theme');document.documentElement.dataset.theme=t==='light'||t==='dark'?t:matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'}catch(e){}";
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="sv" suppressHydrationWarning><head><script dangerouslySetInnerHTML={{__html:themeScript}}/></head><body>{children}</body></html>}
