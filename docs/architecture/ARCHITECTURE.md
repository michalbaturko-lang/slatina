# Architektura platformy Slatina

## Přehled

Slatina je moderní platforma pro analýzu sportovních videí postavená na mikroservisní architektuře s využitím AWS cloudových služeb. Platforma je navržena pro škálovatelnost, nízkou latenci a AI-powered automatickou analýzu.

## Komponenty systému

### 1. Frontend (Next.js)

#### Video Player Component
```
VideoPlayer/
├── VideoCanvas.tsx      # Canvas overlay pro anotace
├── Controls.tsx         # Play/pause, seek, speed
├── Timeline.tsx         # Časová osa s events
└── hooks/
    ├── useVideoSync.ts  # Synchronizace videa a canvasu
    └── useAnnotations.ts # Správa anotací
```

**Klíčové technologie:**
- HTML5 Video API pro přehrávání
- Canvas 2D API pro kreslení anotací
- requestAnimationFrame pro smooth rendering
- WebCodecs API pro pokročilé operace

#### Annotation Tools (Telestration)
```
AnnotationTools/
├── Pencil.tsx           # Volné kreslení
├── Arrow.tsx            # Šipky (rovné, zakřivené)
├── Circle.tsx           # Kruhy a elipsy
├── PlayerMarker.tsx     # X a O značky
├── Text.tsx             # Textové popisky
├── Spotlight.tsx        # Zvýraznění oblasti
└── Measurement.tsx      # Měření vzdálenosti/úhlu
```

#### Voice Recording
- MediaRecorder API pro nahrávání
- Web Audio API pro vizualizaci
- Synchronizace s video timeline

### 2. Backend API (Node.js/Express)

#### Struktura API
```
/api/v1/
├── /auth
│   ├── POST /login
│   ├── POST /register
│   └── POST /refresh
├── /teams
│   ├── GET /
│   ├── POST /
│   ├── GET /:id
│   └── PUT /:id/members
├── /videos
│   ├── GET /
│   ├── POST /upload
│   ├── GET /:id
│   ├── GET /:id/stream
│   └── DELETE /:id
├── /annotations
│   ├── GET /video/:videoId
│   ├── POST /
│   ├── PUT /:id
│   └── DELETE /:id
├── /clips
│   ├── POST /create
│   ├── GET /:id
│   └── POST /:id/share
└── /ai
    ├── POST /analyze/:videoId
    ├── GET /events/:videoId
    └── POST /feedback
```

#### Databázové schéma (PostgreSQL)

```sql
-- Users
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'player',
    created_at TIMESTAMP DEFAULT NOW()
);

-- Teams
CREATE TABLE teams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    sport VARCHAR(100) NOT NULL,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Team Members
CREATE TABLE team_members (
    team_id UUID REFERENCES teams(id),
    user_id UUID REFERENCES users(id),
    role VARCHAR(50) DEFAULT 'player',
    PRIMARY KEY (team_id, user_id)
);

-- Videos
CREATE TABLE videos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID REFERENCES teams(id),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    s3_key VARCHAR(500) NOT NULL,
    duration_seconds INTEGER,
    resolution VARCHAR(20),
    status VARCHAR(50) DEFAULT 'processing',
    uploaded_by UUID REFERENCES users(id),
    match_date DATE,
    opponent VARCHAR(255),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Annotations
CREATE TABLE annotations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    video_id UUID REFERENCES videos(id),
    user_id UUID REFERENCES users(id),
    type VARCHAR(50) NOT NULL,
    start_time DECIMAL(10,3) NOT NULL,
    end_time DECIMAL(10,3),
    data JSONB NOT NULL,
    audio_s3_key VARCHAR(500),
    created_at TIMESTAMP DEFAULT NOW()
);

-- AI Events (detected by ML)
CREATE TABLE ai_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    video_id UUID REFERENCES videos(id),
    event_type VARCHAR(100) NOT NULL,
    start_time DECIMAL(10,3) NOT NULL,
    end_time DECIMAL(10,3),
    confidence DECIMAL(5,4),
    metadata JSONB,
    verified_by UUID REFERENCES users(id),
    is_correct BOOLEAN,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Clips
CREATE TABLE clips (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    video_id UUID REFERENCES videos(id),
    title VARCHAR(255),
    start_time DECIMAL(10,3) NOT NULL,
    end_time DECIMAL(10,3) NOT NULL,
    annotations_included UUID[],
    s3_key VARCHAR(500),
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW()
);
```

### 3. AWS Infrastructure

#### Video Upload & Processing Pipeline

```
┌────────────┐    ┌─────────────┐    ┌──────────────┐    ┌─────────────┐
│  Frontend  │───▶│  S3 Upload  │───▶│   Lambda     │───▶│ MediaConvert│
│  (presigned│    │  (raw/)     │    │  (trigger)   │    │ (transcode) │
│   URL)     │    │             │    │              │    │             │
└────────────┘    └─────────────┘    └──────────────┘    └─────────────┘
                                                                │
                                                                ▼
┌────────────┐    ┌─────────────┐    ┌──────────────┐    ┌─────────────┐
│  CloudFront│◀───│  S3 Output  │◀───│   Lambda     │◀───│   SNS       │
│  (streaming│    │  (processed/)│   │  (status)    │    │  (complete) │
│    HLS)    │    │             │    │              │    │             │
└────────────┘    └─────────────┘    └──────────────┘    └─────────────┘
```

#### S3 Bucket Structure
```
slatina-videos-{env}/
├── raw/                    # Originální upload
│   └── {teamId}/{videoId}/
├── processed/              # Transkódované
│   └── {teamId}/{videoId}/
│       ├── hls/           # HLS streaming
│       ├── thumbnails/    # Náhledy
│       └── clips/         # Exportované klipy
├── annotations/           # Audio komentáře
│   └── {videoId}/{annotationId}.webm
└── ai-training/           # Data pro trénink ML
    └── {sport}/
```

#### MediaConvert Job Template
```json
{
  "OutputGroups": [
    {
      "Name": "HLS",
      "OutputGroupSettings": {
        "Type": "HLS_GROUP_SETTINGS",
        "HlsGroupSettings": {
          "SegmentLength": 6,
          "MinSegmentLength": 2
        }
      },
      "Outputs": [
        {
          "VideoDescription": {
            "Height": 1080,
            "Width": 1920,
            "CodecSettings": {
              "Codec": "H_264",
              "H264Settings": {
                "RateControlMode": "QVBR",
                "MaxBitrate": 8000000
              }
            }
          }
        },
        {
          "VideoDescription": {
            "Height": 720,
            "Width": 1280,
            "CodecSettings": {
              "Codec": "H_264",
              "H264Settings": {
                "RateControlMode": "QVBR",
                "MaxBitrate": 5000000
              }
            }
          }
        },
        {
          "VideoDescription": {
            "Height": 480,
            "Width": 854,
            "CodecSettings": {
              "Codec": "H_264",
              "H264Settings": {
                "RateControlMode": "QVBR",
                "MaxBitrate": 2500000
              }
            }
          }
        }
      ]
    }
  ]
}
```

### 4. AI/ML Pipeline

#### Architektura AI služby

```
┌─────────────────────────────────────────────────────────────────┐
│                     AI Analysis Pipeline                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐     │
│  │ Frame        │───▶│ Object       │───▶│ Event        │     │
│  │ Extraction   │    │ Detection    │    │ Classification│     │
│  │ (Lambda)     │    │ (Rekognition/│    │ (SageMaker)  │     │
│  │              │    │  YOLO)       │    │              │     │
│  └──────────────┘    └──────────────┘    └──────────────┘     │
│         │                   │                   │              │
│         ▼                   ▼                   ▼              │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐     │
│  │ Player       │    │ Tracking     │    │ Pattern      │     │
│  │ Detection    │    │ (DeepSORT)   │    │ Recognition  │     │
│  └──────────────┘    └──────────────┘    └──────────────┘     │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
                    ┌──────────────────┐
                    │  AI Events DB    │
                    │  + Feedback Loop │
                    └──────────────────┘
```

#### Detekované události (podle sportu)

**Fotbal/Hokej:**
- Gól
- Střela na branku
- Přihrávka
- Faul
- Ofsajd
- Rohový kop / Buly
- Formace týmu

**Obecné:**
- Pohyb hráčů (tracking)
- Heat mapy
- Rychlost běhu
- Vzdálenost

#### Model Training Pipeline

```python
# Pseudokód pro continuous learning

class CoachFeedbackLearning:
    """
    Učení z anotací trenérů - feedback loop
    """

    def collect_training_data(self):
        # 1. Sbírání verified AI events
        verified_events = db.query("""
            SELECT * FROM ai_events
            WHERE verified_by IS NOT NULL
        """)

        # 2. Sbírání manuálních anotací
        manual_annotations = db.query("""
            SELECT * FROM annotations
            WHERE type IN ('situation', 'mistake', 'good_play')
        """)

        return verified_events + manual_annotations

    def train_custom_model(self, training_data):
        # Fine-tuning na datech týmu
        model = load_base_model('sports-analysis-v1')
        model.fine_tune(training_data)
        return model

    def deploy_model(self, model, team_id):
        # Deploy jako SageMaker endpoint
        sagemaker.deploy(
            model=model,
            endpoint_name=f'team-{team_id}-analyzer'
        )
```

#### Předdefinované strategie a situace

```typescript
// Konfigurovatelné patterns pro detekci
interface StrategyPattern {
  id: string;
  name: string;
  sport: 'football' | 'hockey' | 'basketball';
  description: string;

  // Vizuální pattern (pozice hráčů)
  playerPositions: {
    role: string;
    relativePosition: { x: number; y: number };
    tolerance: number;
  }[];

  // Časový pattern (sekvence eventů)
  eventSequence?: {
    event: string;
    maxTimeDelta: number;
  }[];
}

const patterns: StrategyPattern[] = [
  {
    id: 'counter-attack',
    name: 'Rychlý protiútok',
    sport: 'football',
    description: 'Detekce protiútoku po zisku míče',
    eventSequence: [
      { event: 'ball_recovery', maxTimeDelta: 0 },
      { event: 'forward_pass', maxTimeDelta: 3000 },
      { event: 'shot', maxTimeDelta: 8000 }
    ]
  },
  {
    id: 'defensive-mistake',
    name: 'Chyba v obraně',
    sport: 'hockey',
    description: 'Hráč opustil pozici',
    playerPositions: [
      // Definice očekávaných pozic
    ]
  }
];
```

### 5. Real-time Collaboration

#### WebSocket Events

```typescript
// Socket.io events pro real-time spolupráci

interface SocketEvents {
  // Připojení k video room
  'join-video': { videoId: string; userId: string };
  'leave-video': { videoId: string; userId: string };

  // Synchronizace přehrávání
  'video-sync': {
    videoId: string;
    currentTime: number;
    isPlaying: boolean;
    playbackRate: number;
  };

  // Live anotace
  'annotation-start': {
    videoId: string;
    userId: string;
    type: string;
  };
  'annotation-update': {
    videoId: string;
    annotationId: string;
    data: AnnotationData;
  };
  'annotation-complete': {
    videoId: string;
    annotationId: string;
  };

  // Komentáře
  'comment-added': {
    videoId: string;
    comment: Comment;
  };

  // Kurzory ostatních uživatelů
  'cursor-move': {
    videoId: string;
    userId: string;
    position: { x: number; y: number };
  };
}
```

### 6. Export Pipeline

#### Screenshot Export
```typescript
async function captureScreenshot(
  videoElement: HTMLVideoElement,
  annotationCanvas: HTMLCanvasElement,
  timestamp: number
): Promise<Blob> {
  // Seek to timestamp
  videoElement.currentTime = timestamp;
  await new Promise(r => videoElement.onseeked = r);

  // Create composite canvas
  const canvas = document.createElement('canvas');
  canvas.width = videoElement.videoWidth;
  canvas.height = videoElement.videoHeight;
  const ctx = canvas.getContext('2d')!;

  // Draw video frame
  ctx.drawImage(videoElement, 0, 0);

  // Draw annotations
  ctx.drawImage(annotationCanvas, 0, 0);

  return new Promise(resolve => {
    canvas.toBlob(blob => resolve(blob!), 'image/png');
  });
}
```

#### Video Clip Export (Server-side)
```python
# Lambda function pro vytvoření klipu s anotacemi

import boto3
from moviepy.editor import VideoFileClip, CompositeVideoClip

def create_clip_with_annotations(
    video_s3_key: str,
    start_time: float,
    end_time: float,
    annotations: list,
    audio_annotations: list
) -> str:
    # Download video from S3
    video = download_from_s3(video_s3_key)

    # Clip video
    clip = VideoFileClip(video).subclip(start_time, end_time)

    # Render annotations as overlay
    annotation_clip = render_annotations(annotations, clip.duration)

    # Composite
    final = CompositeVideoClip([clip, annotation_clip])

    # Add audio annotations
    if audio_annotations:
        final = add_audio_overlay(final, audio_annotations)

    # Export
    output_path = f'/tmp/clip_{uuid4()}.mp4'
    final.write_videofile(output_path)

    # Upload to S3
    s3_key = upload_to_s3(output_path)

    return s3_key
```

## Bezpečnost

### Autentizace a autorizace
- JWT tokeny s refresh mechanismem
- Role-based access control (RBAC)
- Team-level permissions

### Data Security
- S3 presigned URLs pro upload/download
- CloudFront signed URLs pro streaming
- Encryption at rest (S3, RDS)
- Encryption in transit (TLS)

### GDPR Compliance
- Smazání uživatelských dat na požádání
- Export uživatelských dat
- Consent management

## Škálovatelnost

### Horizontální škálování
- ECS/Fargate pro API
- Auto-scaling groups
- CloudFront edge caching

### Optimalizace
- Redis caching pro metadata
- CDN pro statické assety
- Adaptive bitrate streaming (HLS)

## Monitoring

### Metriky
- CloudWatch pro AWS služby
- Custom metrics pro business logic
- Error tracking (Sentry)

### Alerty
- Video processing failures
- High latency
- Error rate thresholds
