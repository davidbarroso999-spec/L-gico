import type {Metadata} from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'HARPIA | Hórus Amazônico de Rotas e Planejamento com Inteligência Artificial',
  description: 'Sistema inteligente de roteirização e otimização tática para operações logísticas.',
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="pt-BR" className="overflow-x-hidden">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
          integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY="
          crossOrigin=""
        />
      </head>
      <body suppressHydrationWarning className="bg-slate-950 text-slate-100 antialiased h-dvh overflow-hidden w-full">
        {children}
      </body>
    </html>
  );
}
