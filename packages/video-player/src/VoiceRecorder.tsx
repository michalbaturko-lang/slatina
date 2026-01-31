'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { Mic, Square, Play, Pause, Trash2, Save } from 'lucide-react';

interface VoiceRecorderProps {
  onSave: (blob: Blob, startTime: number, endTime: number) => void;
  currentTime: number;
  isVideoPlaying: boolean;
}

type RecordingState = 'idle' | 'recording' | 'recorded' | 'playing';

export function VoiceRecorder({
  onSave,
  currentTime,
  isVideoPlaying,
}: VoiceRecorderProps) {
  const [state, setState] = useState<RecordingState>('idle');
  const [startTime, setStartTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [audioLevel, setAudioLevel] = useState(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const audioUrlRef = useRef<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (audioUrlRef.current) {
        URL.revokeObjectURL(audioUrlRef.current);
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      // Setup audio analysis for level meter
      audioContextRef.current = new AudioContext();
      const source = audioContextRef.current.createMediaStreamSource(stream);
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 256;
      source.connect(analyserRef.current);

      // Start level monitoring
      const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
      const updateLevel = () => {
        if (analyserRef.current && state === 'recording') {
          analyserRef.current.getByteFrequencyData(dataArray);
          const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
          setAudioLevel(average / 255);
          requestAnimationFrame(updateLevel);
        }
      };

      // Setup MediaRecorder
      mediaRecorderRef.current = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus',
      });

      chunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        audioUrlRef.current = URL.createObjectURL(blob);
        stream.getTracks().forEach((track) => track.stop());
        setDuration(currentTime - startTime);
        setState('recorded');
      };

      setStartTime(currentTime);
      mediaRecorderRef.current.start(100);
      setState('recording');
      updateLevel();
    } catch (err) {
      console.error('Failed to start recording:', err);
      alert('Nepodařilo se spustit nahrávání. Zkontrolujte oprávnění mikrofonu.');
    }
  }, [currentTime, startTime, state]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && state === 'recording') {
      mediaRecorderRef.current.stop();
      setAudioLevel(0);
    }
  }, [state]);

  const playRecording = useCallback(() => {
    if (!audioUrlRef.current) return;

    if (!audioRef.current) {
      audioRef.current = new Audio(audioUrlRef.current);
      audioRef.current.onended = () => setState('recorded');
    }

    audioRef.current.play();
    setState('playing');
  }, []);

  const pausePlayback = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      setState('recorded');
    }
  }, []);

  const deleteRecording = useCallback(() => {
    if (audioUrlRef.current) {
      URL.revokeObjectURL(audioUrlRef.current);
      audioUrlRef.current = null;
    }
    if (audioRef.current) {
      audioRef.current = null;
    }
    chunksRef.current = [];
    setState('idle');
    setDuration(0);
  }, []);

  const saveRecording = useCallback(() => {
    if (chunksRef.current.length > 0) {
      const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
      onSave(blob, startTime, startTime + duration);
      deleteRecording();
    }
  }, [onSave, startTime, duration, deleteRecording]);

  return (
    <div className="flex items-center gap-2 bg-black/80 rounded-lg p-2">
      {state === 'idle' && (
        <button
          onClick={startRecording}
          className="flex items-center gap-2 px-3 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors"
        >
          <Mic className="w-4 h-4" />
          <span className="text-sm">Nahrát komentář</span>
        </button>
      )}

      {state === 'recording' && (
        <>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
            <span className="text-white text-sm font-mono">
              {formatTime(currentTime - startTime)}
            </span>
          </div>

          {/* Audio level meter */}
          <div className="w-20 h-2 bg-gray-700 rounded overflow-hidden">
            <div
              className="h-full bg-green-500 transition-all duration-75"
              style={{ width: `${audioLevel * 100}%` }}
            />
          </div>

          <button
            onClick={stopRecording}
            className="p-2 bg-red-500 hover:bg-red-600 text-white rounded-lg"
          >
            <Square className="w-4 h-4" />
          </button>
        </>
      )}

      {(state === 'recorded' || state === 'playing') && (
        <>
          <span className="text-white text-sm font-mono">
            {formatTime(duration)}
          </span>

          {state === 'recorded' ? (
            <button
              onClick={playRecording}
              className="p-2 bg-gray-600 hover:bg-gray-500 text-white rounded-lg"
            >
              <Play className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={pausePlayback}
              className="p-2 bg-gray-600 hover:bg-gray-500 text-white rounded-lg"
            >
              <Pause className="w-4 h-4" />
            </button>
          )}

          <button
            onClick={deleteRecording}
            className="p-2 bg-gray-600 hover:bg-gray-500 text-white rounded-lg"
          >
            <Trash2 className="w-4 h-4" />
          </button>

          <button
            onClick={saveRecording}
            className="flex items-center gap-1 px-3 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg"
          >
            <Save className="w-4 h-4" />
            <span className="text-sm">Uložit</span>
          </button>
        </>
      )}
    </div>
  );
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}
