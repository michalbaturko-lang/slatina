/**
 * Demo Store - Lokální úložiště pro demo verzi
 * Používá IndexedDB pro videa a localStorage pro metadata
 */

export interface DemoVideo {
  id: string;
  title: string;
  opponent?: string;
  date: string;
  duration: number;
  sport: string;
  blob?: Blob;
  url?: string;
  status: 'uploading' | 'processing' | 'ready';
  uploadProgress: number;
  aiEvents: AIEvent[];
  createdAt: number;
}

export interface AIEvent {
  id: string;
  type: string;
  label: string;
  labelCz: string;
  time: number;
  endTime?: number;
  confidence: number;
  severity: 'info' | 'warning' | 'critical';
  verified?: boolean;
  coachingTips: string[];
  players?: string[];
}

const DB_NAME = 'slatina-demo';
const DB_VERSION = 1;
const STORE_NAME = 'videos';

// IndexedDB pro velké soubory (videa)
async function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
  });
}

// Uložit video blob do IndexedDB
export async function saveVideoBlob(id: string, blob: Blob): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.put({ id, blob, savedAt: Date.now() });

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

// Načíst video blob z IndexedDB
export async function getVideoBlob(id: string): Promise<Blob | null> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(id);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const result = request.result;
      resolve(result?.blob || null);
    };
  });
}

// Smazat video blob
export async function deleteVideoBlob(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.delete(id);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

// LocalStorage pro metadata
const VIDEOS_KEY = 'slatina-videos';

export function getVideos(): DemoVideo[] {
  if (typeof window === 'undefined') return [];
  const data = localStorage.getItem(VIDEOS_KEY);
  return data ? JSON.parse(data) : [];
}

export function saveVideos(videos: DemoVideo[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(VIDEOS_KEY, JSON.stringify(videos));
}

export function addVideo(video: Omit<DemoVideo, 'id' | 'createdAt' | 'aiEvents'>): DemoVideo {
  const newVideo: DemoVideo = {
    ...video,
    id: `video-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    createdAt: Date.now(),
    aiEvents: [],
  };

  const videos = getVideos();
  videos.unshift(newVideo);
  saveVideos(videos);

  return newVideo;
}

export function updateVideo(id: string, updates: Partial<DemoVideo>): DemoVideo | null {
  const videos = getVideos();
  const index = videos.findIndex(v => v.id === id);

  if (index === -1) return null;

  videos[index] = { ...videos[index], ...updates };
  saveVideos(videos);

  return videos[index];
}

export function getVideo(id: string): DemoVideo | null {
  const videos = getVideos();
  return videos.find(v => v.id === id) || null;
}

export function deleteVideo(id: string): void {
  const videos = getVideos();
  const filtered = videos.filter(v => v.id !== id);
  saveVideos(filtered);
  deleteVideoBlob(id).catch(console.error);
}

// Generování mock AI events na základě délky videa
export function generateMockAIEvents(duration: number, sport: string = 'football'): AIEvent[] {
  const events: AIEvent[] = [];
  const eventTypes = [
    {
      type: 'square_bunching',
      label: 'Players Bunching',
      labelCz: 'Chumel hráčů',
      severity: 'warning' as const,
      coachingTips: [
        'Rozběhněte se od sebe! Jste moc blízko.',
        'Čtverec! Vzpomeňte si - od sebe, od sebe!',
        'Představte si bublinu kolem sebe.',
      ],
    },
    {
      type: 'offer_standing',
      label: 'No Offer',
      labelCz: 'Stojí na místě',
      severity: 'warning' as const,
      coachingTips: [
        'Pohni se! Nabídni se spoluhráči!',
        'Stojíš - kam ti má přihrát?',
        'Řekni si o míč - zavolej a naběhni!',
      ],
    },
    {
      type: 'marking_lost',
      label: 'Lost Opponent',
      labelCz: 'Ztráta hráče',
      severity: 'critical' as const,
      coachingTips: [
        'Ztratil jsi ho! Kontroluj míč I hráče!',
        'Hlava na otočku: míč - hráč - míč!',
      ],
    },
    {
      type: 'good_square',
      label: 'Good Spacing',
      labelCz: 'Správný čtverec',
      severity: 'info' as const,
      coachingTips: [
        'Výborně! Skvělé rozestupy!',
      ],
    },
    {
      type: 'good_offer',
      label: 'Good Offer',
      labelCz: 'Správná nabídka',
      severity: 'info' as const,
      coachingTips: [
        'Výborná nabídka!',
      ],
    },
    {
      type: 'gk_no_offer',
      label: 'No GK Offer',
      labelCz: 'Chybí nabídka brankáři',
      severity: 'warning' as const,
      coachingTips: [
        'Roztáhněte se! Brankář nemá kam přihrát!',
        'Široce! Každý na svou stranu!',
      ],
    },
  ];

  // Pro krátká videa (< 30s) - vygeneruj 2-3 eventy
  if (duration < 30) {
    const numEvents = Math.min(3, Math.max(2, Math.floor(duration / 5)));
    for (let i = 0; i < numEvents; i++) {
      const eventType = eventTypes[Math.floor(Math.random() * eventTypes.length)];
      const time = (duration / (numEvents + 1)) * (i + 1);
      events.push({
        id: `event-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type: eventType.type,
        label: eventType.label,
        labelCz: eventType.labelCz,
        time: Math.max(0.5, time),
        confidence: 0.7 + Math.random() * 0.25,
        severity: eventType.severity,
        coachingTips: eventType.coachingTips,
      });
    }
    return events.sort((a, b) => a.time - b.time);
  }

  // Pro delší videa - 1 event každých 30-60 sekund
  let time = 15 + Math.random() * 15;
  while (time < duration - 10) {
    const eventType = eventTypes[Math.floor(Math.random() * eventTypes.length)];
    events.push({
      id: `event-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: eventType.type,
      label: eventType.label,
      labelCz: eventType.labelCz,
      time,
      confidence: 0.7 + Math.random() * 0.25,
      severity: eventType.severity,
      coachingTips: eventType.coachingTips,
    });

    time += 30 + Math.random() * 30;
  }

  return events.sort((a, b) => a.time - b.time);
}

// Simulace AI analýzy
export async function simulateAIAnalysis(
  videoId: string,
  duration: number,
  onProgress?: (progress: number) => void
): Promise<AIEvent[]> {
  const events = generateMockAIEvents(duration);

  // Simulace postupného zpracování
  for (let i = 0; i <= 100; i += 10) {
    await new Promise(r => setTimeout(r, 300));
    onProgress?.(i);
  }

  // Ulož events k videu
  updateVideo(videoId, { aiEvents: events, status: 'ready' });

  return events;
}
