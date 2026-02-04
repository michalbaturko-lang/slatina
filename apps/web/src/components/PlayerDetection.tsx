'use client';

import { useState, useEffect, useCallback } from 'react';
import { Users, Loader2, RefreshCw, Check, X, AlertCircle } from 'lucide-react';
import { getPlayers, Player } from '@/lib/team-store';
import {
  detectPlayersFromVideoUrl,
  getPlayersForVideo,
  savePlayersForVideo,
  setPlayersForVideoManually,
  DetectionResult,
} from '@/lib/player-detection';

interface PlayerDetectionProps {
  videoId: string;
  videoUrl: string;
  onPlayersDetected?: (players: Player[]) => void;
}

export default function PlayerDetection({ videoId, videoUrl, onPlayersDetected }: PlayerDetectionProps) {
  const [isDetecting, setIsDetecting] = useState(false);
  const [detectionStatus, setDetectionStatus] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [detectedPlayers, setDetectedPlayers] = useState<Player[]>([]);
  const [detectedNumbers, setDetectedNumbers] = useState<number[]>([]);
  const [confidence, setConfidence] = useState<string>('');
  const [isManualMode, setIsManualMode] = useState(false);
  const [allPlayers, setAllPlayers] = useState<Player[]>([]);
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<Set<string>>(new Set());
  const [hasExistingDetection, setHasExistingDetection] = useState(false);

  // Load existing detection and players
  useEffect(() => {
    const players = getPlayers().filter(p => p.active);
    setAllPlayers(players);

    const existing = getPlayersForVideo(videoId);
    if (existing) {
      setHasExistingDetection(true);
      setDetectedNumbers(existing.numbers);
      setConfidence(existing.confidence || '');
      const detected = existing.playerIds
        .map(id => players.find(p => p.id === id))
        .filter(Boolean) as Player[];
      setDetectedPlayers(detected);
      setSelectedPlayerIds(new Set(existing.playerIds));
      onPlayersDetected?.(detected);
    }
  }, [videoId, onPlayersDetected]);

  // Auto-detect on first load if no existing detection
  // Now with retry logic for 429 errors
  useEffect(() => {
    if (!hasExistingDetection && videoUrl && !isDetecting && detectedPlayers.length === 0 && !error) {
      // Delay auto-detection to allow video to load
      const timer = setTimeout(() => {
        runDetection();
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [videoUrl, hasExistingDetection, error]);

  const runDetection = useCallback(async () => {
    if (!videoUrl || isDetecting) return;

    setIsDetecting(true);
    setError(null);
    setDetectionStatus('Spouštím detekci...');

    try {
      const result = await detectPlayersFromVideoUrl(videoUrl, setDetectionStatus);

      setDetectedPlayers(result.players);
      setDetectedNumbers(result.numbers);
      setConfidence(result.confidence);
      savePlayersForVideo(videoId, result);
      setHasExistingDetection(true);
      setSelectedPlayerIds(new Set(result.players.map(p => p.id)));
      onPlayersDetected?.(result.players);

      setDetectionStatus('');
    } catch (err) {
      console.error('Detection failed:', err);
      setError(err instanceof Error ? err.message : 'Detekce selhala');
      setDetectionStatus('');
    } finally {
      setIsDetecting(false);
    }
  }, [videoUrl, videoId, isDetecting, onPlayersDetected]);

  const togglePlayer = (playerId: string) => {
    const newSelected = new Set(selectedPlayerIds);
    if (newSelected.has(playerId)) {
      newSelected.delete(playerId);
    } else {
      newSelected.add(playerId);
    }
    setSelectedPlayerIds(newSelected);
  };

  const saveManualSelection = () => {
    const playerIds = Array.from(selectedPlayerIds);
    setPlayersForVideoManually(videoId, playerIds);

    const selected = playerIds
      .map(id => allPlayers.find(p => p.id === id))
      .filter(Boolean) as Player[];

    setDetectedPlayers(selected);
    setDetectedNumbers(selected.map(p => p.number).filter((n): n is number => n !== undefined));
    setConfidence('high');
    setIsManualMode(false);
    setHasExistingDetection(true);
    onPlayersDetected?.(selected);
  };

  const cancelManualSelection = () => {
    setSelectedPlayerIds(new Set(detectedPlayers.map(p => p.id)));
    setIsManualMode(false);
  };

  // Sort players by number
  const sortedPlayers = [...allPlayers].sort((a, b) => {
    if (a.number && b.number) return a.number - b.number;
    if (a.number) return -1;
    if (b.number) return 1;
    return a.name.localeCompare(b.name, 'cs');
  });

  return (
    <div style={{
      backgroundColor: '#1f2937',
      borderRadius: 12,
      padding: 16,
      marginTop: 16,
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 12,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Users size={18} style={{ color: '#60a5fa' }} />
          <span style={{ fontWeight: 600, fontSize: 14 }}>Hráči ve videu</span>
          {confidence && !isManualMode && (
            <span style={{
              fontSize: 11,
              padding: '2px 6px',
              borderRadius: 4,
              backgroundColor: confidence === 'high' ? '#166534' : confidence === 'medium' ? '#854d0e' : '#7f1d1d',
              color: 'white',
            }}>
              {confidence === 'high' ? 'jistá detekce' : confidence === 'medium' ? 'částečná' : 'nejistá'}
            </span>
          )}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {!isManualMode && (
            <>
              <button
                onClick={() => {
                  setSelectedPlayerIds(new Set(detectedPlayers.map(p => p.id)));
                  setIsManualMode(true);
                }}
                style={{
                  padding: '6px 10px',
                  backgroundColor: '#374151',
                  border: 'none',
                  borderRadius: 6,
                  color: 'white',
                  cursor: 'pointer',
                  fontSize: 12,
                }}
              >
                Upravit
              </button>
              <button
                onClick={runDetection}
                disabled={isDetecting}
                style={{
                  padding: '6px 10px',
                  backgroundColor: '#2563eb',
                  border: 'none',
                  borderRadius: 6,
                  color: 'white',
                  cursor: isDetecting ? 'wait' : 'pointer',
                  fontSize: 12,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  opacity: isDetecting ? 0.7 : 1,
                }}
              >
                {isDetecting ? (
                  <Loader2 size={14} className="animate-spin" style={{ animation: 'spin 1s linear infinite' }} />
                ) : (
                  <RefreshCw size={14} />
                )}
                {hasExistingDetection ? 'Znovu' : 'Detekovat'}
              </button>
            </>
          )}
          {isManualMode && (
            <>
              <button
                onClick={cancelManualSelection}
                style={{
                  padding: '6px 10px',
                  backgroundColor: '#374151',
                  border: 'none',
                  borderRadius: 6,
                  color: 'white',
                  cursor: 'pointer',
                  fontSize: 12,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                <X size={14} />
                Zrušit
              </button>
              <button
                onClick={saveManualSelection}
                style={{
                  padding: '6px 10px',
                  backgroundColor: '#16a34a',
                  border: 'none',
                  borderRadius: 6,
                  color: 'white',
                  cursor: 'pointer',
                  fontSize: 12,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                <Check size={14} />
                Uložit
              </button>
            </>
          )}
        </div>
      </div>

      {/* Detection status */}
      {isDetecting && detectionStatus && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: 12,
          backgroundColor: '#374151',
          borderRadius: 8,
          marginBottom: 12,
        }}>
          <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
          <span style={{ fontSize: 13, color: '#9ca3af' }}>{detectionStatus}</span>
        </div>
      )}

      {/* Error */}
      {error && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: 12,
          backgroundColor: '#7f1d1d',
          borderRadius: 8,
          marginBottom: 12,
        }}>
          <AlertCircle size={16} />
          <span style={{ fontSize: 13 }}>{error}</span>
        </div>
      )}

      {/* Manual mode - show all players */}
      {isManualMode ? (
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 8,
        }}>
          {sortedPlayers.map(player => {
            const isSelected = selectedPlayerIds.has(player.id);
            return (
              <button
                key={player.id}
                onClick={() => togglePlayer(player.id)}
                style={{
                  padding: '8px 12px',
                  backgroundColor: isSelected ? '#166534' : '#374151',
                  border: isSelected ? '2px solid #22c55e' : '2px solid transparent',
                  borderRadius: 8,
                  color: 'white',
                  cursor: 'pointer',
                  fontSize: 13,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  transition: 'all 0.15s',
                }}
              >
                {player.number && (
                  <span style={{
                    backgroundColor: isSelected ? '#22c55e' : '#6b7280',
                    color: isSelected ? '#000' : '#fff',
                    padding: '2px 6px',
                    borderRadius: 4,
                    fontWeight: 700,
                    fontSize: 12,
                  }}>
                    {player.number}
                  </span>
                )}
                {player.name}
                {isSelected && <Check size={14} style={{ color: '#22c55e' }} />}
              </button>
            );
          })}
        </div>
      ) : (
        /* Display detected players */
        <div>
          {detectedPlayers.length > 0 ? (
            <div style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 8,
            }}>
              {detectedPlayers.map(player => (
                <div
                  key={player.id}
                  style={{
                    padding: '8px 12px',
                    backgroundColor: '#166534',
                    borderRadius: 8,
                    fontSize: 13,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  {player.number && (
                    <span style={{
                      backgroundColor: '#22c55e',
                      color: '#000',
                      padding: '2px 6px',
                      borderRadius: 4,
                      fontWeight: 700,
                      fontSize: 12,
                    }}>
                      {player.number}
                    </span>
                  )}
                  {player.name}
                </div>
              ))}
            </div>
          ) : !isDetecting && !error && !hasExistingDetection ? (
            <p style={{ fontSize: 13, color: '#9ca3af' }}>
              Klikněte na tlačítko vpravo pro automatické rozpoznání hráčů z videa.
            </p>
          ) : !isDetecting && !error && hasExistingDetection && detectedPlayers.length === 0 ? (
            <p style={{ fontSize: 13, color: '#9ca3af' }}>
              Nebyli rozpoznáni žádní hráči. Zkuste kliknout na "Znovu" nebo upravte ručně.
            </p>
          ) : null}

          {/* Show unmatched numbers */}
          {detectedNumbers.length > detectedPlayers.length && (
            <div style={{ marginTop: 12 }}>
              <p style={{ fontSize: 12, color: '#9ca3af', marginBottom: 4 }}>
                Nerozpoznaná čísla (nejsou v seznamu hráčů):
              </p>
              <div style={{ display: 'flex', gap: 4 }}>
                {detectedNumbers
                  .filter(n => !detectedPlayers.some(p => p.number === n))
                  .map(n => (
                    <span
                      key={n}
                      style={{
                        padding: '4px 8px',
                        backgroundColor: '#374151',
                        borderRadius: 4,
                        fontSize: 12,
                      }}
                    >
                      #{n}
                    </span>
                  ))}
              </div>
            </div>
          )}
        </div>
      )}

      <style jsx global>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
