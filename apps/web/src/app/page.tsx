'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  Video, Pencil, Upload, Users, ChevronRight, Mic, Camera,
  Share2, MessageSquare, Trophy, Clock, Palette, UserCircle,
  Play, Target, FileText, Download, Smartphone, Calendar
} from 'lucide-react';
import { getVideos, getMatches, Video as VideoType, Match } from '@/lib/cloud-store';

export default function Home() {
  const [recentVideos, setRecentVideos] = useState<VideoType[]>([]);
  const [recentMatches, setRecentMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [videos, matches] = await Promise.all([
          getVideos(),
          getMatches(),
        ]);
        setRecentVideos(videos.slice(0, 5));
        setRecentMatches(matches.slice(0, 3));
      } catch (err) {
        console.error('Failed to load data:', err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);
  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header Navigation */}
      <header className="border-b border-gray-800 bg-gray-900/95 backdrop-blur sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Image src="/logo.svg" alt="SK Slatina" width={32} height={32} className="rounded" />
            <span className="font-semibold hidden sm:inline">SK Slatina 2017</span>
          </Link>
          <nav className="flex items-center gap-4">
            <Link href="/players" className="flex items-center gap-1 text-gray-300 hover:text-white transition text-sm">
              <Users className="w-4 h-4" />
              Hráči
            </Link>
            <Link href="/matches" className="flex items-center gap-1 text-gray-300 hover:text-white transition text-sm">
              <Trophy className="w-4 h-4" />
              Zápasy
            </Link>
            <Link
              href="/videos/upload"
              className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition"
            >
              <Upload className="w-4 h-4" />
              Nahrát video
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative py-20 px-4">
        <div className="max-w-6xl mx-auto text-center">
          <div className="flex items-center justify-center gap-4 mb-6">
            <Image
              src="/logo.svg"
              alt="SK Slatina"
              width={80}
              height={80}
              className="rounded-xl"
            />
            <h1 className="text-5xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
              SK Slatina 2017
            </h1>
          </div>
          <p className="text-2xl text-gray-300 mb-4">
            Platforma pro analýzu sportovních videí
          </p>
          <p className="text-lg text-gray-400 max-w-2xl mx-auto mb-12">
            Nahrávejte videa ze zápasů, kreslete přímo na video, přidávejte hlasové komentáře
            a sdílejte analýzy s hráči a rodiči.
          </p>

          <div className="flex gap-4 justify-center flex-wrap">
            <Link
              href="/videos"
              className="flex items-center gap-2 px-8 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
            >
              <Video className="w-5 h-5" />
              Analyzovat videa
              <ChevronRight className="w-4 h-4" />
            </Link>
            <Link
              href="/videos/upload"
              className="flex items-center gap-2 px-8 py-3 border border-gray-600 rounded-lg font-semibold hover:bg-gray-800 transition-colors"
            >
              <Upload className="w-5 h-5" />
              Nahrát video
            </Link>
          </div>

          {/* Recent activity section */}
          {!loading && (recentVideos.length > 0 || recentMatches.length > 0) && (
            <div className="mt-16 text-left max-w-2xl mx-auto">
              {/* Recent Matches */}
              {recentMatches.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-sm font-semibold text-gray-400 mb-3 flex items-center gap-2">
                    <Trophy className="w-4 h-4" />
                    Poslední zápasy
                  </h3>
                  <div className="space-y-2">
                    {recentMatches.map(match => (
                      <Link
                        key={match.id}
                        href={`/matches`}
                        className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg hover:bg-gray-800 transition group"
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-2 h-2 rounded-full ${
                            match.goals_for > match.goals_against ? 'bg-green-500' :
                            match.goals_for < match.goals_against ? 'bg-red-500' : 'bg-yellow-500'
                          }`} />
                          <span className="font-medium">{match.name}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className={`font-bold ${
                            match.goals_for > match.goals_against ? 'text-green-500' :
                            match.goals_for < match.goals_against ? 'text-red-500' : 'text-yellow-500'
                          }`}>
                            {match.goals_for}:{match.goals_against}
                          </span>
                          <span className="text-xs text-gray-500">
                            {new Date(match.date).toLocaleDateString('cs-CZ')}
                          </span>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* Recent Videos */}
              {recentVideos.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-400 mb-3 flex items-center gap-2">
                    <Video className="w-4 h-4" />
                    Nejnovější videa ({recentVideos.length})
                  </h3>
                  <div className="space-y-2">
                    {recentVideos.slice(0, 3).map(video => (
                      <Link
                        key={video.id}
                        href={`/videos/${video.id}`}
                        className="flex items-center gap-3 p-3 bg-gray-800/50 rounded-lg hover:bg-gray-800 transition group"
                      >
                        {video.thumbnail_url ? (
                          <img src={video.thumbnail_url} alt="" className="w-16 h-10 rounded object-cover" />
                        ) : (
                          <div className="w-16 h-10 rounded bg-gray-700 flex items-center justify-center">
                            <Play className="w-4 h-4 text-gray-500" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate group-hover:text-blue-400 transition">{video.title}</p>
                          <p className="text-xs text-gray-500 flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {new Date(video.created_at).toLocaleDateString('cs-CZ')}
                          </p>
                        </div>
                      </Link>
                    ))}
                  </div>
                  {recentVideos.length > 3 && (
                    <Link href="/videos" className="block text-center text-sm text-blue-400 hover:text-blue-300 mt-3">
                      Zobrazit všech {recentVideos.length} videí →
                    </Link>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      {/* How it works - MOVED ABOVE "Co to umí" */}
      <section className="py-20 px-4 bg-gray-800/50">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">Jak na to</h2>
          <div className="grid md:grid-cols-5 gap-4">
            <StepCard
              number={1}
              title="Nahraj video"
              description="Vyber video ze zápasu nebo tréninku z telefonu či počítače"
            />
            <StepCard
              number={2}
              title="Vyplň info"
              description="Zvol zápas/trénink, zadej výsledek a vyber protihráče"
            />
            <StepCard
              number={3}
              title="Analyzuj"
              description="Kresli na video, nahrávej komentáře, pořizuj screenshoty"
            />
            <StepCard
              number={4}
              title="Taguj hráče"
              description="Označ hráče, kterých se situace týká"
            />
            <StepCard
              number={5}
              title="Sdílej"
              description="Pošli shrnutí nebo screenshoty rodičům a hráčům"
            />
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">Co to umí</h2>
          <div className="grid md:grid-cols-4 sm:grid-cols-2 gap-6">
            <FeatureCard
              icon={<Pencil className="w-5 h-5" />}
              title="Kreslení na video"
              description="Šipky, kruhy, čáry - kreslete přímo na video a vysvětlujte situace"
            />
            <FeatureCard
              icon={<Mic className="w-5 h-5" />}
              title="Hlasové komentáře"
              description="Nahrávejte komentáře k situacím s automatickým přepisem"
            />
            <FeatureCard
              icon={<Camera className="w-5 h-5" />}
              title="Screenshoty"
              description="Pořizujte snímky důležitých momentů včetně anotací"
            />
            <FeatureCard
              icon={<Share2 className="w-5 h-5" />}
              title="Sdílení"
              description="Sdílejte screenshoty a shrnutí přes WhatsApp, email..."
            />
            <FeatureCard
              icon={<Clock className="w-5 h-5" />}
              title="Timeline značky"
              description="Komentáře, screenshoty a nahrávky na časové ose"
            />
            <FeatureCard
              icon={<MessageSquare className="w-5 h-5" />}
              title="Textové poznámky"
              description="Přidávejte komentáře k jednotlivým časům ve videu"
            />
            <FeatureCard
              icon={<UserCircle className="w-5 h-5" />}
              title="Profily hráčů"
              description="Evidence hráčů s fotkami, pozicemi a statistikami"
            />
            <FeatureCard
              icon={<Trophy className="w-5 h-5" />}
              title="Zápasy a turnaje"
              description="Evidence zápasů, výsledků a připojení videí"
            />
            <FeatureCard
              icon={<Target className="w-5 h-5" />}
              title="Góly a asistence"
              description="Zaznamenávejte střelce a nahrávače"
            />
            <FeatureCard
              icon={<Users className="w-5 h-5" />}
              title="Tagování hráčů"
              description="Označujte hráče v komentářích a situacích"
            />
            <FeatureCard
              icon={<Palette className="w-5 h-5" />}
              title="Barvy a nástroje"
              description="Volba barev, tloušťky čáry, guma, reset"
            />
            <FeatureCard
              icon={<Smartphone className="w-5 h-5" />}
              title="Mobilní design"
              description="Optimalizováno pro telefony i tablety"
            />
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 border-t border-gray-800">
        <div className="max-w-6xl mx-auto text-center text-gray-500 text-sm">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Image src="/logo.svg" alt="SK Slatina" width={24} height={24} className="rounded" />
            <p>SK Slatina 2017 - Platforma pro analýzu videí</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="p-4 bg-gray-800 rounded-lg border border-gray-700 hover:border-blue-600 transition">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-9 h-9 bg-blue-600/20 text-blue-400 rounded-lg flex items-center justify-center flex-shrink-0">
          {icon}
        </div>
        <h3 className="font-semibold">{title}</h3>
      </div>
      <p className="text-gray-400 text-sm">{description}</p>
    </div>
  );
}

function StepCard({
  number,
  title,
  description,
}: {
  number: number;
  title: string;
  description: string;
}) {
  return (
    <div className="text-center relative">
      {/* Connector line */}
      {number < 5 && (
        <div className="hidden md:block absolute top-6 left-1/2 w-full h-0.5 bg-gray-700" />
      )}
      <div className="w-12 h-12 bg-blue-600 text-white rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-3 relative z-10">
        {number}
      </div>
      <h3 className="font-semibold mb-1">{title}</h3>
      <p className="text-gray-400 text-xs">{description}</p>
    </div>
  );
}
