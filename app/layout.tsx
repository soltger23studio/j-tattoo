import type { Metadata } from 'next';
import './globals.css';

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
    <html lang="hu">
      <body>{children}</body>
    </html>
  );
}
