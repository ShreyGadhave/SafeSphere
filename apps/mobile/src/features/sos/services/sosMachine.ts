/**
 * SOS state machine (PLAN §3.3). Pure: no timers, no I/O — the provider drives time and runs
 * side effects when the phase changes. Keeping it pure makes every transition unit-testable.
 *
 *   idle ──trigger(AI)──▶ confirm ──ok──▶ idle
 *        │                  └─timeout──▶ countdown
 *        └─trigger(button)──────────────▶ countdown ──cancel──▶ idle
 *                                            └─timeout──▶ active
 *   active ──pin(safe)──▶ resolved
 *   active ──pin(duress) or 5× wrong──▶ duress   (looks resolved, keeps tracking silently)
 *   duress ──serverClosed──▶ resolved
 */

import { SOS_TIMING, type AlertTrigger, type EmergencyType } from '../constants';

export type SosPhase = 'idle' | 'confirm' | 'countdown' | 'active' | 'duress' | 'resolved';

export type SosState = {
  phase: SosPhase;
  trigger: AlertTrigger | null;
  emergencyType: EmergencyType;
  /** Client-generated alert id (known before the row reaches the server). */
  alertId: string | null;
  /** ISO time the alert went active. */
  activatedAt: string | null;
  wrongPinAttempts: number;
  /** Why the session ended — kept for the resolved screen and analytics. */
  endReason: 'safe' | 'duress' | 'wrong_pins' | 'server' | null;
};

export type SosEvent =
  | { type: 'TRIGGER'; source: AlertTrigger; emergencyType?: EmergencyType; requireConfirm: boolean }
  | { type: 'SET_TYPE'; emergencyType: EmergencyType }
  | { type: 'CONFIRM_OK' }
  | { type: 'CONFIRM_TIMEOUT' }
  | { type: 'CANCEL' }
  | { type: 'COUNTDOWN_DONE'; alertId: string; at: string }
  | { type: 'PIN_RESULT'; result: 'safe' | 'duress' | 'wrong' }
  | { type: 'SERVER_CLOSED' }
  | { type: 'DISMISS' };

export const initialSosState: SosState = {
  phase: 'idle',
  trigger: null,
  emergencyType: 'unknown',
  alertId: null,
  activatedAt: null,
  wrongPinAttempts: 0,
  endReason: null,
};

export function sosReducer(state: SosState, event: SosEvent): SosState {
  switch (event.type) {
    case 'TRIGGER':
      // A second trigger while an SOS is already running must never reset it.
      if (state.phase !== 'idle' && state.phase !== 'resolved') return state;
      return {
        ...initialSosState,
        phase: event.requireConfirm ? 'confirm' : 'countdown',
        trigger: event.source,
        emergencyType: event.emergencyType ?? 'unknown',
      };

    case 'SET_TYPE':
      if (state.phase === 'idle' || state.phase === 'resolved') return state;
      return { ...state, emergencyType: event.emergencyType };

    case 'CONFIRM_OK':
      return state.phase === 'confirm' ? initialSosState : state;

    case 'CONFIRM_TIMEOUT':
      return state.phase === 'confirm' ? { ...state, phase: 'countdown' } : state;

    case 'CANCEL':
      // Before ACTIVE nothing has been sent, so a single tap cancels. After that a PIN is required.
      return state.phase === 'confirm' || state.phase === 'countdown' ? initialSosState : state;

    case 'COUNTDOWN_DONE':
      if (state.phase !== 'countdown') return state;
      return { ...state, phase: 'active', alertId: event.alertId, activatedAt: event.at };

    case 'PIN_RESULT': {
      if (state.phase !== 'active') return state;
      if (event.result === 'safe') return { ...state, phase: 'resolved', endReason: 'safe' };
      if (event.result === 'duress') return { ...state, phase: 'duress', endReason: 'duress' };
      const attempts = state.wrongPinAttempts + 1;
      if (attempts >= SOS_TIMING.maxWrongPins) {
        return { ...state, phase: 'duress', wrongPinAttempts: attempts, endReason: 'wrong_pins' };
      }
      return { ...state, wrongPinAttempts: attempts };
    }

    case 'SERVER_CLOSED':
      return state.phase === 'duress' || state.phase === 'active'
        ? { ...state, phase: 'resolved', endReason: state.endReason ?? 'server' }
        : state;

    case 'DISMISS':
      return state.phase === 'resolved' ? initialSosState : state;
  }
}

/** Phases in which side effects (SMS, tracking, recording) must be running. */
export function isLive(phase: SosPhase): boolean {
  return phase === 'active' || phase === 'duress';
}

/**
 * What the screen shows. Duress deliberately looks exactly like a normal resolution so someone
 * watching the phone believes the alert was cancelled.
 */
export function visiblePhase(phase: SosPhase): Exclude<SosPhase, 'duress'> {
  return phase === 'duress' ? 'resolved' : phase;
}
