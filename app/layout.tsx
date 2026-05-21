import type {Metadata} from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Logix Route | Smart Delivery Planner',
  description: 'Intelligent route optimization with real-time weather and traffic analysis.',
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="pt-BR">
      <head>
        <link
          rel="stylesheet"
          href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
          integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY="
          crossOrigin=""
        />
      </head>
      <body suppressHydrationWarning className="bg-slate-950 text-slate-100 antialiased">
        {children}
      </body>
    </html>
  );
}
