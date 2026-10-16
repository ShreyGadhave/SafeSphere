import { createContext, type ReactNode, useContext, useEffect, useMemo, useRef, useState } from 'react';

import { useSafetySettings } from '@/features/profile';
import { useActiveTrip } from '@/features/ride/state/tripStore';
import { triggerSos, useSos } from '@/features/sos';
import { requestPermission } from '@/lib/permissions';

import config from '../../../assets/models/distress_config.json';
import { type AudioDetection, type AudioDiagnostics, AudioDistressDetector } from './audioDetector';
import { FallDetector } from './motionDetector';

/**
 * Runs the on-device AI triggers (ML-3 scream, ML-4 fall) while they are armed:
 *  - Guard mode (switched on from Home), or
 *  - an active Safe Walk / Safe Ride.
 * Each detector also follows its own toggle in safety settings. Detections never send an SOS
 * directly: they open the 10 s "Are you OK?" check (B5).
 */

type DetectionState = {
  guardMode: boolean;
  setGuardMode: (on: boolean) => void;
  listening: { audio: boolean; motion: boolean };
  /** Latest scream score (0–1) while listening, for the live readout; threshold is what triggers. */
  audioLevel: AudioDetection | null;
  threshold: number;
  audioDiag: AudioDiagnostics | null;
  error: string | null;
};

const DetectionContext = createContext<DetectionState | null>(null);

export function DetectionProvider({ children }: { children: ReactNode }) {
  const { settings } = useSafetySettings();
  const sos = useSos();
  const [guardMode, setGuardMode] = useState(false);
  const tripArmed = useActiveTrip() != null;
  const [listening, setListening] = useState({ audio: false, motion: false });
  const [error, setError] = useState<string | null>(null);
  const [audioLevel, setAudioLevel] = useState<AudioDetection | null>(null);
  const [audioDiag, setAudioDiag] = useState<AudioDiagnostics | null>(null);
  const audio = useRef(new AudioDistressDetector());
  const motion = useRef(new FallDetector());

  // Detectors pause while an SOS is in progress (the evidence recorder owns the microphone).
  const armed = (guardMode || tripArmed) && sos.phase === 'idle';
  const wantAudio = armed && settings.screamDetection && AudioDistressDetector.isSupported();
  const wantMotion = armed && settings.fallDetection;

  useEffect(() => {
    const detector = audio.current;
    if (!wantAudio) return;
    let cancelled = false;
    void (async () => {
      // Ask for the microphone here too: onboarding may have been skipped or the permission revoked.
      if ((await requestPermission('microphone')) !== 'granted') {
        if (!cancelled) setError('Microphone permission is off, so scream detection cannot listen. Allow it in Settings.');
        return;
      }
      if (cancelled) return;
      setError(null);
      await detector.start(
        () => triggerSos({ source: 'audio', requireConfirm: true }),
        (d) => !cancelled && setAudioLevel(d),
      );
      if (!cancelled) setListening((l) => ({ ...l, audio: true }));
    })().catch((e: Error) => !cancelled && setError(`Scream detection could not start: ${e.message}`));
    // Diagnostics refresh once a second (they also show when no score arrives at all).
    const poll = setInterval(() => setAudioDiag({ ...detector.diag }), 1000);
    return () => {
      cancelled = true;
      clearInterval(poll);
      void detector.stop();
      setListening((l) => ({ ...l, audio: false }));
      setAudioLevel(null);
      setAudioDiag(null);
    };
  }, [wantAudio]);

  useEffect(() => {
    const detector = motion.current;
    if (!wantMotion) return;
    let cancelled = false;
    detector
      .start(() => triggerSos({ source: 'motion', requireConfirm: true }))
      .then(() => !cancelled && setListening((l) => ({ ...l, motion: true })))
      .catch((e: Error) => setError(e.message));
    return () => {
      cancelled = true;
      detector.stop();
      setListening((l) => ({ ...l, motion: false }));
    };
  }, [wantMotion]);

  const value = useMemo(
    () => ({ guardMode, setGuardMode, listening, audioLevel, threshold: config.threshold, audioDiag, error }),
    [guardMode, listening, audioLevel, audioDiag, error],
  );
  return <DetectionContext.Provider value={value}>{children}</DetectionContext.Provider>;
}

export function useDetection(): DetectionState {
  const ctx = useContext(DetectionContext);
  if (!ctx) throw new Error('useDetection must be used inside DetectionProvider');
  return ctx;
}
