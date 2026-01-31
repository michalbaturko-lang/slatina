import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from '@/components/Providers';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Slatina - Sports Video Analysis',
  description: 'Platforma pro analýzu sportovních videí pro trenéry a hráče',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="cs">
      <body className={inter.className}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
