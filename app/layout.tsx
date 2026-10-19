import type {Metadata, Viewport} from 'next';
import './globals.css';
export const metadata:Metadata={title:'TVÅAN',description:'Följ Hockeytvåan live. Spara dina lag och matcher.',manifest:'/manifest.webmanifest',icons:{icon:'/favicon.svg',apple:'/apple-touch-icon.png'},appleWebApp:{capable:true,title:'TVÅAN',statusBarStyle:'default'}};
export const viewport:Viewport={width:'device-width',initialScale:1,viewportFit:'cover',themeColor:'#f2f2f7'};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="sv"><body>{children}</body></html>}
