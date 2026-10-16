import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import { router } from 'expo-router';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { AppState, Vibration } from 'react-native';

import { checkPin, type PinCheck } from '@/lib/pin';

import { ConfirmOverlay } from '../components/ConfirmOverlay';
import { CountdownOverlay } from '../components/CountdownOverlay';
import { SOS_TIMING, STORAGE_KEYS, type AlertTrigger, type EmergencyType } from '../constants';
import type { Fix } from '../services/location';
import {
  initialSosState,
  isLive,
  sosReducer,
  visiblePhase,
  type SosEvent,
  type SosPhase,
  type SosState,
} from '../services/sosMachine';
import {
  activateSos,
  endDuress,
  isClosedOnServer,
  markDuress,
  resolveSafe,
  resumeSos,
  type EngineCallbacks,
  type TimelineStep,
} from '../services/sosEngine';

type Persisted = { state: SosState; timeline: TimelineStep[]; lastFix: Fix | null; shareToken: string | null };

export type SosContextValue = {
  /** What the UI should show (duress is reported as 'resolved'). */
  phase: Exclude<SosPhase, 'duress'>;
  emergencyType: EmergencyType;
  trigger: AlertTrigger | null;
  activatedAt: string | null;
  wrongPinAttempts: number;
  timeline: TimelineStep[];
  lastFix: Fix | null;
  shareToken: string | null;
  /** Seconds left in the confirm/countdown phase. */
  secondsLeft: number;
  trigger$: (options: TriggerOptions) => boolean;
  setEmergencyType: (type: EmergencyType) => void;
  cancel: () => void;
  confirmOk: () => void;
  /** Skip the rest of the "Are you OK?" wait and go to the 5 s countdown. */
  escalate: () => void;
  submitPin: (pin: string) => Promise<PinCheck>;
  dismiss: () => void;
};

export type TriggerOptions = {
  source?: AlertTrigger;
  type?: EmergencyType;
  /** AI triggers (motion, audio, ride anomaly) ask "Are you OK?" first (B5). */
  requireConfirm?: boolean;
};

const SosContext = createContext<SosContextValue | null>(null);

// Lets code outside React (future AI detectors, notification actions) start an SOS.
let externalTrigger: ((options: TriggerOptions) => boolean) | null = null;

/**
 * Start an SOS from anywhere. Button presses skip the confirm step; AI detectors should pass
 * `requireConfirm: true`. Returns false if no SosProvider is mounted or an SOS is already running.
 */
export function triggerSos(options: TriggerOptions = {}): boolean {
  return externalTrigger?.(options) ?? false;
}

function mergeStep(timeline: TimelineStep[], step: TimelineStep): TimelineStep[] {
  const i = timeline.findIndex((s) => s.kind === step.kind);
  if (i === -1) return [...timeline, step];
  const next = [...timeline];
  next[i] = step;
  return next;
}

export function SosProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(sosReducer, initialSosState);
  const [timeline, setTimeline] = useState<TimelineStep[]>([]);
  const [lastFix, setLastFix] = useState<Fix | null>(null);
  const [shareToken, setShareToken] = useState<string | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [hydrated, setHydrated] = useState(false);
  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);
  const previousPhase = useRef<SosPhase>('idle');
  const restoring = useRef(false);

  const callbacks = useMemo<EngineCallbacks>(
    () => ({
      onStep: (step) => setTimeline((t) => mergeStep(t, step)),
      onFix: setLastFix,
      onShareToken: setShareToken,
    }),
    [],
  );

  // ── Restore an SOS that was running when the app was closed ──
  useEffect(() => {
    void (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEYS.session);
        const saved = raw ? (JSON.parse(raw) as Persisted) : null;
        if (saved && isLive(saved.state.phase) && saved.state.alertId) {
          restoring.current = true;
          dispatch({ type: 'TRIGGER', source: saved.state.trigger ?? 'button', requireConfirm: false });
          dispatch({ type: 'SET_TYPE', emergencyType: saved.state.emergencyType });
          dispatch({ type: 'COUNTDOWN_DONE', alertId: saved.state.alertId, at: saved.state.activatedAt ?? '' });
          if (saved.state.phase === 'duress') dispatch({ type: 'PIN_RESULT', result: 'duress' });
          setTimeline(saved.timeline);
          setLastFix(saved.lastFix);
          setShareToken(saved.shareToken);
        }
      } finally {
        setHydrated(true);
      }
    })();
  }, []);

  // ── Persist while live; clear when finished ──
  useEffect(() => {
    if (!hydrated) return;
    if (isLive(state.phase)) {
      const data: Persisted = { state, timeline, lastFix, shareToken };
      void AsyncStorage.setItem(STORAGE_KEYS.session, JSON.stringify(data));
    } else if (state.phase === 'idle' || state.phase === 'resolved') {
      void AsyncStorage.removeItem(STORAGE_KEYS.session);
    }
  }, [hydrated, state, timeline, lastFix, shareToken]);

  // ── Confirm (10 s) and countdown (5 s) timers ──
  useEffect(() => {
    if (state.phase !== 'confirm' && state.phase !== 'countdown') {
      Vibration.cancel();
      return;
    }
    const total = state.phase === 'confirm' ? SOS_TIMING.confirmS : SOS_TIMING.countdownS;
    if (state.phase === 'confirm') Vibration.vibrate([0, 400, 600], true);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reset the visible countdown when a timed phase starts
    setSecondsLeft(total);
    const started = Date.now();
    const timer = setInterval(() => {
      const left = total - Math.floor((Date.now() - started) / 1000);
      if (left > 0) {
        setSecondsLeft(left);
        return;
      }
      clearInterval(timer);
      setSecondsLeft(0);
      if (stateRef.current.phase === 'confirm') dispatch({ type: 'CONFIRM_TIMEOUT' });
      else dispatch({ type: 'COUNTDOWN_DONE', alertId: Crypto.randomUUID(), at: new Date().toISOString() });
    }, 250);
    return () => {
      clearInterval(timer);
      Vibration.cancel();
    };
  }, [state.phase]);

  // ── Side effects on phase changes ──
  useEffect(() => {
    const prev = previousPhase.current;
    previousPhase.current = state.phase;
    if (prev === state.phase) return;

    if (state.phase === 'active' && state.alertId) {
      router.push('/sos-active');
      if (restoring.current) {
        restoring.current = false;
        void resumeSos(state.alertId, callbacks);
      } else {
        setTimeline([]);
        void activateSos(
          { alertId: state.alertId, trigger: state.trigger ?? 'button', emergencyType: state.emergencyType },
          callbacks,
        );
      }
    }
    if (state.phase === 'duress' && state.alertId) {
      if (restoring.current) {
        restoring.current = false;
        void resumeSos(state.alertId, callbacks);
      } else {
        void markDuress(state.alertId);
      }
    }
    if (state.phase === 'resolved' && prev === 'active' && state.alertId && state.endReason === 'safe') {
      void resolveSafe(state.alertId, callbacks);
    }
  }, [state.phase, state.alertId, state.trigger, state.emergencyType, state.endReason, callbacks]);

  // ── Duress sessions end when staff close the alert on the server ──
  useEffect(() => {
    if (state.phase !== 'duress' || !state.alertId) return;
    const alertId = state.alertId;
    const check = async () => {
      if (await isClosedOnServer(alertId)) {
        await endDuress();
        dispatch({ type: 'SERVER_CLOSED' });
      }
    };
    const sub = AppState.addEventListener('change', (s) => s === 'active' && void check());
    const timer = setInterval(() => void check(), 60_000);
    return () => {
      sub.remove();
      clearInterval(timer);
    };
  }, [state.phase, state.alertId]);

  const trigger$ = useCallback((options: TriggerOptions) => {
    const phase = stateRef.current.phase;
    if (phase !== 'idle' && phase !== 'resolved') return false;
    dispatch({
      type: 'TRIGGER',
      source: options.source ?? 'button',
      emergencyType: options.type,
      requireConfirm: options.requireConfirm ?? false,
    });
    return true;
  }, []);

  useEffect(() => {
    externalTrigger = trigger$;
    return () => {
      if (externalTrigger === trigger$) externalTrigger = null;
    };
  }, [trigger$]);

  const submitPin = useCallback(async (pin: string) => {
    const result = await checkPin(pin);
    dispatch({ type: 'PIN_RESULT', result });
    return result;
  }, []);

  const value = useMemo<SosContextValue>(
    () => ({
      phase: visiblePhase(state.phase),
      emergencyType: state.emergencyType,
      trigger: state.trigger,
      activatedAt: state.activatedAt,
      wrongPinAttempts: state.wrongPinAttempts,
      timeline,
      lastFix,
      shareToken,
      secondsLeft,
      trigger$,
      setEmergencyType: (emergencyType) => dispatch({ type: 'SET_TYPE', emergencyType }),
      cancel: () => dispatch({ type: 'CANCEL' } satisfies SosEvent),
      confirmOk: () => dispatch({ type: 'CONFIRM_OK' }),
      escalate: () => dispatch({ type: 'CONFIRM_TIMEOUT' }),
      submitPin,
      dismiss: () => dispatch({ type: 'DISMISS' }),
    }),
    [state, timeline, lastFix, shareToken, secondsLeft, trigger$, submitPin],
  );

  return (
    <SosContext.Provider value={value}>
      {children}
      {state.phase === 'confirm' ? <ConfirmOverlay /> : null}
      {state.phase === 'countdown' ? <CountdownOverlay /> : null}
    </SosContext.Provider>
  );
}

export function useSos(): SosContextValue {
  const ctx = useContext(SosContext);
  if (!ctx) throw new Error('useSos must be used inside <SosProvider>');
  return ctx;
}
