# Slatina - Sports Video Analysis Platform

Platforma pro analýzu sportovních videí určená trenérům a hráčům. Umožňuje nahrávání videí ze zápasů, anotace pomocí "inteligentní tužky", zvukové komentáře a AI-powered automatickou detekci herních situací.

## Klíčové funkce

### Video přehrávač a editor
- **Inteligentní tužka** - kreslení na video (šipky, kruhy, hráčské značky X/O)
- **Zvukové komentáře** - nahrávání hlasových poznámek synchronizovaných s videem
- **Zpomalené přehrávání** - 0.1x až 2x rychlost, frame-by-frame analýza
- **Screenshot a export** - vytváření klipů a obrázků pro sdílení s hráči

### AI analýza
- **Automatická detekce situací** - rozpoznávání gólů, faulů, přihrávek
- **Sledování hráčů** - tracking pohybu jednotlivých hráčů
- **Pattern recognition** - identifikace herních vzorců a formací
- **Učení z komentářů** - AI se učí z anotací trenérů

### Týmová spolupráce
- **Role-based přístup** - admin, trenér, hráč
- **Sdílené knihovny** - centrální úložiště videí
- **Komentáře a diskuze** - pod jednotlivými klipy

## Tech Stack

### Frontend
- **Next.js 14** - React framework s App Router
- **TypeScript** - typová bezpečnost
- **Canvas API** - kreslení anotací na video
- **Web Audio API** - nahrávání zvukových komentářů
- **TailwindCSS** - styling

### Backend
- **Node.js + Express** - REST API
- **PostgreSQL** - databáze (users, teams, annotations)
- **Redis** - caching, sessions
- **Socket.io** - real-time collaboration

### AWS Infrastructure
- **S3** - úložiště videí
- **CloudFront** - CDN pro delivery
- **MediaConvert** - transkódování videí
- **Lambda** - serverless funkce
- **SageMaker** - ML modely pro analýzu
- **Rekognition** - detekce objektů ve videu
- **Transcribe** - převod řeči na text

## Architektura

```
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │ Video Player │  │  Annotation  │  │   AI Panel   │          │
│  │   + Canvas   │  │    Tools     │  │  (detected   │          │
│  │   Overlay    │  │  (telestration)│ │   events)   │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      API GATEWAY                                 │
│            (Authentication, Rate Limiting, Routing)             │
└─────────────────────────────────────────────────────────────────┘
                              │
          ┌───────────────────┼───────────────────┐
          ▼                   ▼                   ▼
┌──────────────────┐ ┌──────────────────┐ ┌──────────────────┐
│   Core API       │ │  Video Service   │ │   AI Service     │
│  - Users/Teams   │ │  - Upload        │ │  - Detection     │
│  - Annotations   │ │  - Transcode     │ │  - Tracking      │
│  - Comments      │ │  - Streaming     │ │  - Learning      │
└──────────────────┘ └──────────────────┘ └──────────────────┘
          │                   │                   │
          ▼                   ▼                   ▼
┌──────────────────┐ ┌──────────────────┐ ┌──────────────────┐
│   PostgreSQL     │ │      S3          │ │   SageMaker      │
│   + Redis        │ │   + CloudFront   │ │   + Rekognition  │
└──────────────────┘ └──────────────────┘ └──────────────────┘
```

## Struktura projektu

```
slatina/
├── apps/
│   ├── web/                 # Next.js frontend
│   └── api/                 # Express backend
├── packages/
│   ├── ui/                  # Shared UI components
│   ├── video-player/        # Video player + canvas
│   ├── annotation-tools/    # Drawing tools
│   └── ai-client/           # AI service client
├── services/
│   ├── video-processor/     # Lambda for video processing
│   └── ai-analyzer/         # SageMaker inference
├── infrastructure/
│   └── terraform/           # AWS IaC
└── docs/
    └── architecture/        # Technical documentation
```

## Spuštění lokálně

```bash
# Instalace závislostí
pnpm install

# Spuštění development serveru
pnpm dev

# Build pro produkci
pnpm build
```

## Licence

MIT
