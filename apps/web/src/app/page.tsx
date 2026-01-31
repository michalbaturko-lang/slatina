import Link from 'next/link';

export default function Home() {
  return (
    <main className="min-h-screen">
      {/* Hero Section */}
      <section className="relative py-20 px-4">
        <div className="max-w-6xl mx-auto text-center">
          <h1 className="text-5xl font-bold mb-6 bg-gradient-to-r from-primary-600 to-accent-500 bg-clip-text text-transparent">
            Slatina
          </h1>
          <p className="text-2xl text-gray-600 mb-8">
            Platforma pro analýzu sportovních videí
          </p>
          <p className="text-lg text-gray-500 max-w-2xl mx-auto mb-12">
            Nahrávejte videa ze zápasů, analyzujte herní situace pomocí inteligentní tužky,
            a nechte AI identifikovat klíčové momenty.
          </p>
          <div className="flex gap-4 justify-center">
            <Link
              href="/dashboard"
              className="px-8 py-3 bg-primary-600 text-white rounded-lg font-semibold hover:bg-primary-700 transition-colors"
            >
              Začít analyzovat
            </Link>
            <Link
              href="/demo"
              className="px-8 py-3 border border-gray-300 rounded-lg font-semibold hover:bg-gray-50 transition-colors"
            >
              Vyzkoušet demo
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 bg-white/50">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">Klíčové funkce</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <FeatureCard
              title="Inteligentní tužka"
              description="Kreslte přímo na video - šipky, kruhy, hráčské značky. Přidávejte hlasové komentáře k jednotlivým situacím."
              icon="pencil"
            />
            <FeatureCard
              title="AI analýza"
              description="Automatická detekce gólů, faulů, přihrávek. Učí se z vašich anotací a identifikuje podobné situace."
              icon="brain"
            />
            <FeatureCard
              title="Sdílení s týmem"
              description="Vytvářejte klipy, screenshoty a sdílejte je s hráči. Celý tým má přístup k video knihovně."
              icon="share"
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
              title="Analyzujte"
              description="Použijte nástroje pro anotace a komentáře"
            />
            <StepCard
              number={3}
              title="AI detekce"
              description="Nechte AI najít klíčové momenty"
            />
            <StepCard
              number={4}
              title="Sdílejte"
              description="Exportujte klipy a sdílejte s hráči"
            />
          </div>
        </div>
      </section>
    </main>
  );
}

function FeatureCard({
  title,
  description,
  icon,
}: {
  title: string;
  description: string;
  icon: string;
}) {
  return (
    <div className="p-6 bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
      <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center mb-4">
        <span className="text-2xl">
          {icon === 'pencil' && '✏️'}
          {icon === 'brain' && '🧠'}
          {icon === 'share' && '📤'}
        </span>
      </div>
      <h3 className="text-xl font-semibold mb-2">{title}</h3>
      <p className="text-gray-600">{description}</p>
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
      <div className="w-12 h-12 bg-primary-600 text-white rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-4">
        {number}
      </div>
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-gray-600 text-sm">{description}</p>
    </div>
  );
}
