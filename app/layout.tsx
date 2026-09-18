import { Analytics } from '@vercel/analytics/next';
import { SpeedInsights } from '@vercel/speed-insights/next';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

/** A --font-sans eddig Intert kért, de sehol nem töltöttük be, így az oldal
 *  rendszerbetűvel futott. Itt kapja meg ténylegesen. */
const inter = Inter({
  subsets: ['latin', 'latin-ext'],
  display: 'swap',
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: {
    default: 'Pet Gyűjtemény – Metin2 pet követő',
    template: '%s | Pet Gyűjtemény',
  },
  description:
    'Rendszerezett Metin2 pet-lista: honnan és hogyan szerezhető meg minden pet, és pipáld ki, melyik van már meg.',
  openGraph: {
    type: 'website',
    locale: 'hu_HU',
    siteName: 'Pet Gyűjtemény',
    title: 'Pet Gyűjtemény – Metin2 pet követő',
    description:
      'Rendszerezett Metin2 pet-lista szűrőkkel és pipálható gyűjtemény-követővel.',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="hu" className={inter.variable}>
      <body>
        {children}
        {/* Vercel Web Analytics (hányan járnak az oldalon) és Speed Insights
            (milyen gyors a valódi látogatóknak). Mindkettő csak a Vercelre
            kirakott oldalon küld adatot – helyi futtatáskor és más hostingon
            nem csinál semmit. A Vercel projektben külön-külön be kell
            kapcsolni őket: Analytics, illetve Speed Insights fül. */}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
