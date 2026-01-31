/**
 * Demo Store - Lokální úložiště pro demo verzi
 * Používá IndexedDB pro videa a localStorage pro metadata
 */

export interface DemoVideo {
  id: string;
  title: string;
  opponent?: string;
  scoreHome?: number;
  scoreAway?: number;
  date: string;
  duration: number;
  sport: string;
  blob?: Blob;
  url?: string;
  thumbnail?: string;
  status: 'uploading' | 'processing' | 'ready';
  uploadProgress: number;
  aiEvents: AIEvent[];
  screenshots: Screenshot[];
  audioComments: AudioComment[];
  createdAt: number;
}

export interface Screenshot {
  id: string;
  time: number;
  dataUrl: string;
  note?: string;
  playerIds?: string[];
  createdAt: number;
}

export interface AudioComment {
  id: string;
  time: number;
  duration: number;
  blobUrl?: string;
  transcript?: string;
  playerIds?: string[];
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

export function addVideo(video: Omit<DemoVideo, 'id' | 'createdAt' | 'aiEvents' | 'screenshots' | 'audioComments'>): DemoVideo {
  const newVideo: DemoVideo = {
    ...video,
    id: `video-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    createdAt: Date.now(),
    aiEvents: [],
    screenshots: [],
    audioComments: [],
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

// Screenshot management
export function addScreenshot(videoId: string, screenshot: Omit<Screenshot, 'id' | 'createdAt'>): Screenshot | null {
  const video = getVideo(videoId);
  if (!video) return null;

  const newScreenshot: Screenshot = {
    ...screenshot,
    id: `screenshot-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    createdAt: Date.now(),
  };

  const screenshots = video.screenshots || [];
  screenshots.push(newScreenshot);
  updateVideo(videoId, { screenshots });

  return newScreenshot;
}

export function deleteScreenshot(videoId: string, screenshotId: string): void {
  const video = getVideo(videoId);
  if (!video) return;

  const screenshots = (video.screenshots || []).filter(s => s.id !== screenshotId);
  updateVideo(videoId, { screenshots });
}

// Audio comment management
export function addAudioComment(videoId: string, audioComment: Omit<AudioComment, 'id' | 'createdAt'>): AudioComment | null {
  const video = getVideo(videoId);
  if (!video) return null;

  const newAudioComment: AudioComment = {
    ...audioComment,
    id: `audio-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    createdAt: Date.now(),
  };

  const audioComments = video.audioComments || [];
  audioComments.push(newAudioComment);
  updateVideo(videoId, { audioComments });

  return newAudioComment;
}

export function deleteAudioComment(videoId: string, audioId: string): void {
  const video = getVideo(videoId);
  if (!video) return;

  const audioComments = (video.audioComments || []).filter(a => a.id !== audioId);
  updateVideo(videoId, { audioComments });
}

// Rozšířené typy událostí pro mládežnický fotbal
interface EventType {
  type: string;
  label: string;
  labelCz: string;
  severity: 'info' | 'warning' | 'critical';
  coachingTips: string[];
  category: 'offense' | 'defense' | 'transition' | 'set_piece' | 'individual';
  ageGroups: string[]; // které věkové kategorie
}

const ALL_EVENT_TYPES: EventType[] = [
  // === ÚTOČNÉ SITUACE ===
  {
    type: 'square_bunching',
    label: 'Players Bunching',
    labelCz: 'Chumel hráčů',
    severity: 'warning',
    category: 'offense',
    ageGroups: ['U9', 'U10', 'U11', 'U12'],
    coachingTips: [
      'Rozběhněte se od sebe! Jste moc blízko.',
      'Čtverec! Vzpomeňte si - od sebe, od sebe!',
      'Představte si bublinu kolem sebe - 5 metrů na každou stranu.',
      'Když jsi blízko spoluhráče, odběhni pryč!',
    ],
  },
  {
    type: 'good_square',
    label: 'Good Spacing',
    labelCz: 'Správný čtverec',
    severity: 'info',
    category: 'offense',
    ageGroups: ['U9', 'U10', 'U11', 'U12'],
    coachingTips: [
      'Výborně! Skvělé rozestupy!',
      'Přesně tak - dobrá vzdálenost mezi hráči.',
      'Super čtverec! Teď máte prostor na přihrávky.',
    ],
  },
  {
    type: 'offer_standing',
    label: 'No Offer',
    labelCz: 'Chybí nabídka',
    severity: 'warning',
    category: 'offense',
    ageGroups: ['U9', 'U10', 'U11', 'U12', 'U13'],
    coachingTips: [
      'Pohni se! Nabídni se spoluhráči!',
      'Stojíš - kam ti má přihrát?',
      'Řekni si o míč - zavolej a naběhni!',
      'Hledej volný prostor a naběhni do něj.',
    ],
  },
  {
    type: 'good_offer',
    label: 'Good Offer',
    labelCz: 'Správná nabídka',
    severity: 'info',
    category: 'offense',
    ageGroups: ['U9', 'U10', 'U11', 'U12', 'U13'],
    coachingTips: [
      'Výborná nabídka!',
      'Skvělý náběh - přesně do volného prostoru.',
      'Super timing nabídky!',
    ],
  },
  {
    type: 'gk_no_offer',
    label: 'No GK Offer',
    labelCz: 'Chybí nabídka brankáři',
    severity: 'warning',
    category: 'offense',
    ageGroups: ['U10', 'U11', 'U12', 'U13'],
    coachingTips: [
      'Roztáhněte se! Brankář nemá kam přihrát!',
      'Široce! Každý na svou stranu!',
      'Nabídněte se brankáři - on vás hledá!',
    ],
  },
  {
    type: 'pass_back_option',
    label: 'No Back Pass Option',
    labelCz: 'Chybí zpětná přihrávka',
    severity: 'warning',
    category: 'offense',
    ageGroups: ['U11', 'U12', 'U13', 'U14'],
    coachingTips: [
      'Nabídni se za míčem! Hráč potřebuje zpětnou variantu.',
      'Trojúhelník! Musí být možnost hrát dozadu.',
      'Otočka - nabídni se, aby mohl hrát zpět.',
    ],
  },
  {
    type: 'third_man_run',
    label: 'Good Third Man Run',
    labelCz: 'Výborný náběh třetího hráče',
    severity: 'info',
    category: 'offense',
    ageGroups: ['U12', 'U13', 'U14', 'U15'],
    coachingTips: [
      'Skvělý náběh! Přesně do prostoru za obránce.',
      'Výborné načasování třetího hráče.',
    ],
  },
  {
    type: 'combination_opportunity',
    label: 'Combination Play Possible',
    labelCz: 'Možná kombinace',
    severity: 'info',
    category: 'offense',
    ageGroups: ['U11', 'U12', 'U13', 'U14'],
    coachingTips: [
      'Tady byla možnost narážečky!',
      'Zkuste kombinaci - přihraj a naběhni.',
      'Dvojkombinace byla možná.',
    ],
  },
  {
    type: 'width_missing',
    label: 'No Width',
    labelCz: 'Chybí šířka hry',
    severity: 'warning',
    category: 'offense',
    ageGroups: ['U11', 'U12', 'U13', 'U14', 'U15'],
    coachingTips: [
      'Roztáhněte hru! Jste moc uprostřed.',
      'Křídla ven! Využijte celou šířku hřiště.',
      'Široce! Máte celé hřiště.',
    ],
  },

  // === OBRANNÉ SITUACE ===
  {
    type: 'marking_lost',
    label: 'Lost Opponent',
    labelCz: 'Ztráta hráče',
    severity: 'critical',
    category: 'defense',
    ageGroups: ['U11', 'U12', 'U13', 'U14', 'U15'],
    coachingTips: [
      'Ztratil jsi ho! Kontroluj míč I hráče!',
      'Hlava na otočku: míč - hráč - míč!',
      'Neztrácej svého hráče z dohledu!',
    ],
  },
  {
    type: 'good_marking',
    label: 'Good Marking',
    labelCz: 'Správné bránění',
    severity: 'info',
    category: 'defense',
    ageGroups: ['U11', 'U12', 'U13', 'U14', 'U15'],
    coachingTips: [
      'Výborně! Držíš si hráče a vidíš míč.',
      'Skvělá pozice - mezi hráčem a brankou.',
    ],
  },
  {
    type: 'pressing_trigger_missed',
    label: 'Pressing Trigger Missed',
    labelCz: 'Zmeškaný signál k pressingu',
    severity: 'warning',
    category: 'defense',
    ageGroups: ['U12', 'U13', 'U14', 'U15'],
    coachingTips: [
      'Špatná přihrávka soupeře - to byl signál k pressingu!',
      'Když soupeř zpracuje špatně, jdeme do něj!',
      'Pressing! To byla šance získat míč.',
    ],
  },
  {
    type: 'good_pressing',
    label: 'Good Pressing',
    labelCz: 'Správný pressing',
    severity: 'info',
    category: 'defense',
    ageGroups: ['U12', 'U13', 'U14', 'U15'],
    coachingTips: [
      'Výborný pressing! Soupeř neměl čas.',
      'Skvělé! Šli jste do toho společně.',
    ],
  },
  {
    type: 'defensive_line_broken',
    label: 'Defensive Line Broken',
    labelCz: 'Rozpadlá obranná linie',
    severity: 'critical',
    category: 'defense',
    ageGroups: ['U13', 'U14', 'U15'],
    coachingTips: [
      'Držte linii! Jeden vyběhl, ostatní musí taky.',
      'Obranná linie se rozpadla - komunikujte!',
      'Společně nahoru nebo společně dozadu!',
    ],
  },
  {
    type: 'cover_shadow',
    label: 'Poor Cover Shadow',
    labelCz: 'Špatné krytí stínem',
    severity: 'warning',
    category: 'defense',
    ageGroups: ['U12', 'U13', 'U14', 'U15'],
    coachingTips: [
      'Postav se tak, abys zablokoval přihrávku!',
      'Krytí stínem - znemožni soupeři přihrát dopředu.',
    ],
  },

  // === PŘECHODOVÉ FÁZE ===
  {
    type: 'transition_slow',
    label: 'Slow Transition',
    labelCz: 'Pomalý přechod do útoku',
    severity: 'warning',
    category: 'transition',
    ageGroups: ['U11', 'U12', 'U13', 'U14', 'U15'],
    coachingTips: [
      'Rychleji! Po zisku míče okamžitě dopředu.',
      'Přechod do útoku musí být bleskový!',
      'Soupeř není připravený - využij to rychle!',
    ],
  },
  {
    type: 'good_transition',
    label: 'Good Transition',
    labelCz: 'Rychlý přechod',
    severity: 'info',
    category: 'transition',
    ageGroups: ['U11', 'U12', 'U13', 'U14', 'U15'],
    coachingTips: [
      'Výborný rychlý přechod!',
      'Skvěle využitá situace po zisku.',
    ],
  },
  {
    type: 'counter_press_missing',
    label: 'No Counter Press',
    labelCz: 'Chybí gegenpressing',
    severity: 'warning',
    category: 'transition',
    ageGroups: ['U13', 'U14', 'U15'],
    coachingTips: [
      'Po ztrátě okamžitě do pressingu! 5 sekund!',
      'Gegenpressing! Nečekej, jdi do míče.',
      'Ztratili jsme - rychle zpět!',
    ],
  },

  // === STANDARDNÍ SITUACE ===
  {
    type: 'corner_positioning',
    label: 'Poor Corner Positioning',
    labelCz: 'Špatné postavení na rohu',
    severity: 'warning',
    category: 'set_piece',
    ageGroups: ['U11', 'U12', 'U13', 'U14', 'U15'],
    coachingTips: [
      'Pamatuj na svoje místo při rohu!',
      'Každý má svou zónu - drž se jí.',
    ],
  },
  {
    type: 'freekick_wall',
    label: 'Wall Not Set',
    labelCz: 'Špatně postavená zeď',
    severity: 'warning',
    category: 'set_piece',
    ageGroups: ['U12', 'U13', 'U14', 'U15'],
    coachingTips: [
      'Zeď musí být rychle postavená!',
      'Správný počet hráčů ve zdi.',
    ],
  },

  // === INDIVIDUÁLNÍ DOVEDNOSTI ===
  {
    type: 'first_touch_poor',
    label: 'Poor First Touch',
    labelCz: 'Špatné zpracování',
    severity: 'warning',
    category: 'individual',
    ageGroups: ['U9', 'U10', 'U11', 'U12'],
    coachingTips: [
      'Zpracuj míč do směru, kam chceš hrát.',
      'První dotek je klíčový - připrav si míč.',
      'Měkký dotek! Míč ti utekl.',
    ],
  },
  {
    type: 'good_first_touch',
    label: 'Excellent First Touch',
    labelCz: 'Výborné zpracování',
    severity: 'info',
    category: 'individual',
    ageGroups: ['U9', 'U10', 'U11', 'U12'],
    coachingTips: [
      'Skvělé zpracování!',
      'Výborný první dotek - hned jsi mohl hrát dál.',
    ],
  },
  {
    type: 'body_orientation',
    label: 'Wrong Body Orientation',
    labelCz: 'Špatné natočení těla',
    severity: 'warning',
    category: 'individual',
    ageGroups: ['U10', 'U11', 'U12', 'U13'],
    coachingTips: [
      'Otoč se tak, abys viděl hřiště!',
      'Tělo natočené do hry - pak uvidíš možnosti.',
      'Neotáčej se zády do hřiště.',
    ],
  },
  {
    type: 'head_up',
    label: 'Head Down',
    labelCz: 'Hlava dole',
    severity: 'warning',
    category: 'individual',
    ageGroups: ['U9', 'U10', 'U11', 'U12'],
    coachingTips: [
      'Hlavu nahoru! Musíš vidět spoluhráče.',
      'Koukej se před přihrávkou, ne jen na míč.',
      'Skenuj hřiště - hlava nahoru!',
    ],
  },
  {
    type: 'communication',
    label: 'No Communication',
    labelCz: 'Chybí komunikace',
    severity: 'warning',
    category: 'individual',
    ageGroups: ['U10', 'U11', 'U12', 'U13', 'U14', 'U15'],
    coachingTips: [
      'Mluv! Spoluhráči potřebují slyšet, co mají dělat.',
      'Komunikace! "Mám čas", "Otočka", "Za tebou!"',
      'Řekni spoluhráči, co vidíš.',
    ],
  },
];

// Generování mock AI events na základě délky videa
export function generateMockAIEvents(duration: number, sport: string = 'football'): AIEvent[] {
  const events: AIEvent[] = [];

  // Filtruj události podle věkové kategorie (default U9 pro SK Slatina 2017)
  const ageGroup = 'U9'; // SK Slatina ročník 2017
  const relevantEvents = ALL_EVENT_TYPES.filter(e => e.ageGroups.includes(ageGroup));

  // Pro krátká videa (< 30s) - vygeneruj 2-4 eventy
  if (duration < 30) {
    const numEvents = Math.min(4, Math.max(2, Math.floor(duration / 4)));
    for (let i = 0; i < numEvents; i++) {
      const eventType = relevantEvents[Math.floor(Math.random() * relevantEvents.length)];
      const time = (duration / (numEvents + 1)) * (i + 1);
      events.push({
        id: `event-${Date.now()}-${i}-${Math.random().toString(36).substr(2, 9)}`,
        type: eventType.type,
        label: eventType.label,
        labelCz: eventType.labelCz,
        time: Math.max(0.5, time),
        confidence: 0.75 + Math.random() * 0.20,
        severity: eventType.severity,
        coachingTips: eventType.coachingTips,
      });
    }
    return events.sort((a, b) => a.time - b.time);
  }

  // Pro delší videa - 1 event každých 20-40 sekund (hustší analýza)
  let time = 10 + Math.random() * 10;
  while (time < duration - 5) {
    const eventType = relevantEvents[Math.floor(Math.random() * relevantEvents.length)];
    events.push({
      id: `event-${Date.now()}-${events.length}-${Math.random().toString(36).substr(2, 9)}`,
      type: eventType.type,
      label: eventType.label,
      labelCz: eventType.labelCz,
      time,
      confidence: 0.75 + Math.random() * 0.20,
      severity: eventType.severity,
      coachingTips: eventType.coachingTips,
    });

    time += 20 + Math.random() * 20;
  }

  return events.sort((a, b) => a.time - b.time);
}

// Generování událostí s kontextem týmu
export function generateMockAIEventsWithTeam(
  duration: number,
  ageGroup: string = 'U15',
  focusAreas: string[] = []
): AIEvent[] {
  const events: AIEvent[] = [];

  // Filtruj události podle věkové kategorie
  let relevantEvents = ALL_EVENT_TYPES.filter(e => e.ageGroups.includes(ageGroup));

  // Pokud jsou definované focus areas, preferuj je
  if (focusAreas.length > 0) {
    const focusEvents = relevantEvents.filter(e =>
      focusAreas.some(area => e.type.includes(area) || e.category === area)
    );
    // Mix: 70% focus events, 30% ostatní
    if (focusEvents.length > 0) {
      relevantEvents = [...focusEvents, ...focusEvents, ...relevantEvents];
    }
  }

  // Generuj události
  let time = 8 + Math.random() * 7;
  while (time < duration - 5) {
    const eventType = relevantEvents[Math.floor(Math.random() * relevantEvents.length)];
    events.push({
      id: `event-${Date.now()}-${events.length}-${Math.random().toString(36).substr(2, 9)}`,
      type: eventType.type,
      label: eventType.label,
      labelCz: eventType.labelCz,
      time,
      confidence: 0.78 + Math.random() * 0.17,
      severity: eventType.severity,
      coachingTips: eventType.coachingTips,
    });

    time += 15 + Math.random() * 25;
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
