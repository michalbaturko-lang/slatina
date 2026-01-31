'use client';

import Link from 'next/link';
import Image from 'next/image';
import {
  Video, Pencil, Upload, Users, ChevronRight, Mic, Camera,
  Share2, MessageSquare, Trophy, Clock, Palette, UserCircle,
  Play, Target, FileText, Download, Smartphone
} from 'lucide-react';

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-900 text-white">
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
            Nahrávejte videa ze zápasů, kreslte přímo na video, přidávejte hlasové komentáře
            a sdílejte analýzy s hráči a rodiči.
          </p>

          {/* Demo notice */}
          <div className="bg-blue-900/30 border border-blue-700 rounded-lg p-4 mb-8 max-w-xl mx-auto">
            <p className="text-sm text-blue-300">
              <strong>Demo verze:</strong> Videa se ukládají lokálně ve vašem prohlížeči.
              Nahrajte vlastní video pro testování všech funkcí.
            </p>
          </div>

          <div className="flex gap-4 justify-center flex-wrap">
            <Link
              href="/videos"
              className="flex items-center gap-2 px-8 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
            >
              <Video className="w-5 h-5" />
              Moje videa
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
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 bg-gray-800/50">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">Co to umí</h2>
          <div className="grid md:grid-cols-4 sm:grid-cols-2 gap-6">
            <FeatureCard
              icon={<Pencil className="w-5 h-5" />}
              title="Kreslení na video"
              description="Šipky, kruhy, čáry - kreslte přímo na video a vysvětlujte situace"
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

      {/* How it works */}
      <section className="py-20 px-4">
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

      {/* CTA */}
      <section className="py-16 px-4 bg-blue-900/30">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-2xl font-bold mb-4">Začněte hned</h2>
          <p className="text-gray-400 mb-8">
            Nahrajte své první video a vyzkoušejte všechny funkce platformy.
          </p>
          <Link
            href="/videos/upload"
            className="inline-flex items-center gap-2 px-8 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
          >
            <Upload className="w-5 h-5" />
            Nahrát první video
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 border-t border-gray-800">
        <div className="max-w-6xl mx-auto text-center text-gray-500 text-sm">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Image src="/logo.svg" alt="SK Slatina" width={24} height={24} className="rounded" />
            <p>SK Slatina 2017 - Platforma pro analýzu videí</p>
          </div>
          <p>Demo verze pro testování</p>
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
