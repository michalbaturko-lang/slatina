'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Home,
  Video,
  Users,
  Brain,
  Upload,
  Menu,
  X,
} from 'lucide-react';
import { useState } from 'react';

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Přehled', icon: Home },
  { href: '/videos', label: 'Videa', icon: Video },
  { href: '/team', label: 'Tým', icon: Users },
  { href: '/analysis', label: 'Analýza', icon: Brain },
];

export function MobileNavigation() {
  const pathname = usePathname();

  return (
    <>
      {/* Bottom Navigation - Mobile Only */}
      <nav className="fixed bottom-0 left-0 right-0 bg-gray-900 border-t border-gray-800 md:hidden z-40 safe-area-bottom">
        <div className="flex items-center justify-around py-2">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center gap-1 px-4 py-2 rounded-lg transition ${
                  isActive
                    ? 'text-blue-400'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <item.icon className="w-5 h-5" />
                <span className="text-xs">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Floating Upload Button - Mobile */}
      <Link
        href="/videos/upload"
        className="fixed bottom-20 right-4 w-14 h-14 bg-blue-600 hover:bg-blue-700 rounded-full shadow-lg flex items-center justify-center md:hidden z-40 transition"
      >
        <Upload className="w-6 h-6" />
      </Link>
    </>
  );
}

export function DesktopSidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden md:flex fixed left-0 top-0 bottom-0 w-64 bg-gray-900 border-r border-gray-800 flex-col z-40">
      {/* Logo */}
      <div className="p-4 border-b border-gray-800">
        <Link href="/dashboard" className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
            <Video className="w-5 h-5" />
          </div>
          <span className="text-xl font-bold">Slatina</span>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition ${
                isActive
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-400 hover:bg-gray-800 hover:text-white'
              }`}
            >
              <item.icon className="w-5 h-5" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Upload Button */}
      <div className="p-4 border-t border-gray-800">
        <Link
          href="/videos/upload"
          className="flex items-center justify-center gap-2 w-full py-3 bg-blue-600 hover:bg-blue-700 rounded-lg transition"
        >
          <Upload className="w-5 h-5" />
          <span>Nahrát video</span>
        </Link>
      </div>

      {/* Team Selector */}
      <div className="p-4 border-t border-gray-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center">
            <Users className="w-5 h-5 text-gray-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium truncate">FC Slatina U9</p>
            <p className="text-xs text-gray-400">12 hráčů</p>
          </div>
        </div>
      </div>
    </aside>
  );
}

export function MobileHeader({ title }: { title?: string }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <>
      <header className="fixed top-0 left-0 right-0 h-14 bg-gray-900 border-b border-gray-800 flex items-center px-4 md:hidden z-50">
        <button
          onClick={() => setIsMenuOpen(true)}
          className="p-2 -ml-2 hover:bg-gray-800 rounded-lg"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex-1 text-center">
          <span className="font-semibold">{title || 'Slatina'}</span>
        </div>

        <div className="w-9" /> {/* Spacer for centering */}
      </header>

      {/* Mobile Menu Overlay */}
      {isMenuOpen && (
        <div
          className="fixed inset-0 bg-black/80 z-50 md:hidden"
          onClick={() => setIsMenuOpen(false)}
        >
          <div
            className="absolute left-0 top-0 bottom-0 w-72 bg-gray-900 p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <span className="text-xl font-bold">Slatina</span>
              <button
                onClick={() => setIsMenuOpen(false)}
                className="p-2 hover:bg-gray-800 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <nav className="space-y-1">
              {NAV_ITEMS.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsMenuOpen(false)}
                  className="flex items-center gap-3 px-4 py-3 rounded-lg text-gray-400 hover:bg-gray-800 hover:text-white transition"
                >
                  <item.icon className="w-5 h-5" />
                  <span>{item.label}</span>
                </Link>
              ))}
            </nav>

            <div className="mt-6 pt-6 border-t border-gray-800">
              <div className="flex items-center gap-3 px-4">
                <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center">
                  <Users className="w-5 h-5 text-gray-400" />
                </div>
                <div>
                  <p className="font-medium">FC Slatina U9</p>
                  <p className="text-xs text-gray-400">12 hráčů</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-950">
      <DesktopSidebar />
      <MobileNavigation />

      {/* Main Content */}
      <main className="md:ml-64 pb-20 md:pb-0">
        {children}
      </main>
    </div>
  );
}
