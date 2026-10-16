/**
 * Background task for Safe Ride / Safe Walk monitoring. Imported once at app start (root layout)
 * so Android can wake it with location batches. Side-effect module: no UI imports.
 */
import type * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';

import { onTripLocations, TRIP_LOCATION_TASK } from './services/tripEngine';

type LocationTaskData = { locations: Location.LocationObject[] };

if (!TaskManager.isTaskDefined(TRIP_LOCATION_TASK)) {
  TaskManager.defineTask<LocationTaskData>(TRIP_LOCATION_TASK, async ({ data, error }) => {
    if (error || !data?.locations?.length) return;
    try {
      await onTripLocations(data.locations);
    } catch (e) {
      console.warn('[trip-task] failed', e);
    }
  });
}
