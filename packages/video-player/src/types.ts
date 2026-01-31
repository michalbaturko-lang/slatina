export interface Annotation {
  id: string;
  videoId: string;
  userId: string;
  type: AnnotationType;
  startTime: number;
  endTime?: number;
  data: AnnotationData;
  audioUrl?: string;
  createdAt: Date;
}

export type AnnotationType =
  | 'pencil'
  | 'arrow'
  | 'circle'
  | 'rectangle'
  | 'player-x'
  | 'player-o'
  | 'text'
  | 'spotlight'
  | 'measurement';

export interface AnnotationData {
  // For drawing tools
  points?: Point[];

  // For shapes
  startPoint?: Point;
  endPoint?: Point;

  // For arrows
  curvePoint?: Point;
  arrowType?: 'straight' | 'curved' | 'animated';

  // For text
  text?: string;
  fontSize?: number;

  // Common
  color: string;
  strokeWidth: number;
  opacity?: number;
}

export interface Point {
  x: number;
  y: number;
}

export interface AIEvent {
  id: string;
  videoId: string;
  eventType: string;
  startTime: number;
  endTime?: number;
  confidence: number;
  metadata?: Record<string, unknown>;
  verifiedBy?: string;
  isCorrect?: boolean;
}

export interface VideoPlayerProps {
  src: string;
  annotations?: Annotation[];
  aiEvents?: AIEvent[];
  onAnnotationCreate?: (annotation: Omit<Annotation, 'id' | 'createdAt'>) => void;
  onAnnotationUpdate?: (id: string, data: Partial<AnnotationData>) => void;
  onTimeUpdate?: (time: number) => void;
  onScreenshot?: (blob: Blob, timestamp: number) => void;
}

export interface VideoControlsProps {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  playbackRate: number;
  isFullscreen: boolean;
  selectedTool: string | null;
  onTogglePlay: () => void;
  onSeek: (time: number) => void;
  onVolumeChange: (volume: number) => void;
  onPlaybackRateChange: (rate: number) => void;
  onToggleFullscreen: () => void;
  onToolSelect: (tool: string | null) => void;
  onScreenshot: () => void;
}

export interface TimelineProps {
  currentTime: number;
  duration: number;
  annotations: Annotation[];
  aiEvents: AIEvent[];
  onSeek: (time: number) => void;
}

export interface AnnotationCanvasProps {
  videoRef: React.RefObject<HTMLVideoElement>;
  annotations: Annotation[];
  isDrawing: boolean;
  selectedTool: string | null;
  onAnnotationCreate?: (annotation: Omit<Annotation, 'id' | 'createdAt'>) => void;
  currentTime: number;
}
