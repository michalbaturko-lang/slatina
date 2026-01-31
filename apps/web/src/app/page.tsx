'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Video, Brain, Pencil, Upload, Users, ChevronRight } from 'lucide-react';

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
            Nahrávejte videa ze zápasů, analyzujte herní situace pomocí inteligentní tužky,
            a nechte AI identifikovat klíčové momenty pro zlepšení vašeho týmu.
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
          <h2 className="text-3xl font-bold text-center mb-12">Klíčové funkce</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <FeatureCard
              icon={<Pencil className="w-6 h-6" />}
              title="Inteligentní tužka"
              description="Kreslte přímo na video - šipky, kruhy, hráčské značky. Přidávejte hlasové komentáře k jednotlivým situacím."
            />
            <FeatureCard
              icon={<Brain className="w-6 h-6" />}
              title="AI analýza"
              description="Automatická detekce taktických situací - chumel hráčů, chybějící nabídka, ztráta hráče při bránění."
            />
            <FeatureCard
              icon={<Users className="w-6 h-6" />}
              title="Pro mládežnický fotbal"
              description="Speciálně navrženo pro trenéry mládeže. Čtverec, nabídka, bránění - vše s českými tipy pro hráče."
            />
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">Jak to funguje</h2>
          <div className="grid md:grid-cols-4 gap-6">
            <StepCard
              number={1}
              title="Nahrajte video"
              description="Nahrajte záznam ze zápasu nebo tréninku"
            />
            <StepCard
              number={2}
              title="AI analýza"
              description="Systém automaticky detekuje situace"
            />
            <StepCard
              number={3}
              title="Ověřte a upravte"
              description="Potvrďte správné detekce, opravte chyby"
            />
            <StepCard
              number={4}
              title="Trénujte"
              description="Použijte tipy pro zlepšení hráčů"
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
    <div className="p-6 bg-gray-800 rounded-xl border border-gray-700 hover:border-gray-600 transition">
      <div className="w-12 h-12 bg-blue-600/20 text-blue-400 rounded-lg flex items-center justify-center mb-4">
        {icon}
      </div>
      <h3 className="text-xl font-semibold mb-2">{title}</h3>
      <p className="text-gray-400">{description}</p>
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
    <div className="text-center">
      <div className="w-12 h-12 bg-blue-600 text-white rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-4">
        {number}
      </div>
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-gray-400 text-sm">{description}</p>
    </div>
  );
}
