import type { Metadata } from 'next';
import './globals.css';
import { Providers } from '@/components/Providers';

export const metadata: Metadata = {
  title: 'SK Slatina 2017 - Video analýza',
  description: 'Platforma pro analýzu sportovních videí pro trenéry SK Slatina',
  icons: {
    icon: '/favicon.svg',
    apple: '/logo.svg',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="cs">
      <body className="font-sans">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
