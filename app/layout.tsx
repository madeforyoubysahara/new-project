import type {Metadata,Viewport} from 'next';
import './globals.css';
import './storefront.css';
export const metadata:Metadata={
 title:'Made for You by Sahara | Handmade Crochet Gifts',
 description:'Shop handmade crochet flower keychains, bows, hairbands and flower garlands. Personalised with love by Sahara.',
 applicationName:'Made for You by Sahara',
 robots:{index:true,follow:true},
 openGraph:{type:'website',title:'Made for You by Sahara | Handmade Crochet Gifts',description:'Little handmade treasures, thoughtfully crafted with love.',images:[{url:'/products/flower-keychain.jpeg',alt:'Handmade crochet flower keychains'}]},
};
export const viewport:Viewport={width:'device-width',initialScale:1,themeColor:'#800b3d'};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><body>{children}</body></html>}
