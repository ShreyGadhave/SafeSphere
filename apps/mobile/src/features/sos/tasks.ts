/**
 * Background tasks for the SOS. Must be imported once at app start (top of the root layout) so
 * TaskManager knows the task when Android wakes the app with location updates.
 * Side-effect module: no UI imports.
 */

import * as TaskManager from 'expo-task-manager';
import type { LocationObject } from 'expo-location';

import { SOS_LOCATION_TASK } from './constants';
import { batteryPercent, readTracking, recordFix } from './services/location';
import { flushOutbox } from './services/outbox';

type LocationTaskData = { locations?: LocationObject[] };

if (!TaskManager.isTaskDefined(SOS_LOCATION_TASK)) {
  TaskManager.defineTask<LocationTaskData>(SOS_LOCATION_TASK, async ({ data, error }) => {
    if (error) {
      console.warn('[sos-task] location error', error.message);
      return;
    }
    const tracking = await readTracking();
    const locations = data?.locations ?? [];
    if (!tracking || tracking.mode !== 'background' || !locations.length) return;

    const battery = await batteryPercent();
    for (const loc of locations) {
      await recordFix(
        tracking.alertId,
        {
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
          accuracy: loc.coords.accuracy ?? null,
          speed: loc.coords.speed ?? null,
          heading: loc.coords.heading ?? null,
          timestamp: loc.timestamp,
        },
        battery,
      );
    }
    await flushOutbox();
  });
}
