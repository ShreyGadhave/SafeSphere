import { createContext, useContext } from 'react';

import type { PinCheck } from '@/lib/pin';

import type { AlertTrigger, EmergencyType } from '../constants';
import type { Fix } from '../services/location';
import type { SosPhase } from '../services/sosMachine';
import type { TimelineStep } from '../services/sosEngine';

/**
 * The SOS context lives in its own module so the overlays rendered by SosProvider can read it
 * without importing SosProvider itself (which would be a require cycle).
 */

export type TriggerOptions = {
  source?: AlertTrigger;
  type?: EmergencyType;
  /** AI triggers (motion, audio, ride anomaly) ask "Are you OK?" first (B5). */
  requireConfirm?: boolean;
};

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

export const SosContext = createContext<SosContextValue | null>(null);

export function useSos(): SosContextValue {
  const ctx = useContext(SosContext);
  if (!ctx) throw new Error('useSos must be used inside <SosProvider>');
  return ctx;
}
