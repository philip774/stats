import type { Metadata } from 'next';
import './globals.css';
export const metadata:Metadata={title:'TVÅAN — Hockey nära dig',description:'Följ Hockeytvåan med liveresultat, spelschema och dina favoritlag. Matchcenter med statistik från Swehockey.',manifest:'/manifest.webmanifest',icons:{icon:'/favicon.svg'},appleWebApp:{capable:true,title:'TVÅAN',statusBarStyle:'default'}};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="sv"><body>{children}</body></html>}
