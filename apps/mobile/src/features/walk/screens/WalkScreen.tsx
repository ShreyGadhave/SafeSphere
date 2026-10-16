import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button, Chip, FormScreen, Text } from '@/components/ui';
import { useCurrentPosition } from '@/features/map/hooks';
import { type Destination, DestinationPicker } from '@/features/ride/components/DestinationPicker';
import { TripMonitor } from '@/features/ride/components/TripMonitor';
import { startTrip } from '@/features/ride/services/tripEngine';
import { useActiveTrip } from '@/features/ride/state/tripStore';
import { spacing } from '@/theme';

const ARRIVE_IN = [null, 10, 20, 30, 45] as const;

/** Safe Walk (C2, C5): pick where you're going and when you'll be there; we watch the walk. */
export function WalkScreen() {
  const trip = useActiveTrip();
  const { position } = useCurrentPosition();
  const [destination, setDestination] = useState<Destination | null>(null);
  const [arriveIn, setArriveIn] = useState<number | null>(null);

  const start = useMutation({
    mutationFn: () => startTrip({ mode: 'walk', origin: position!, destination: destination!, arriveInMin: arriveIn }),
  });

  if (trip) return <TripMonitor trip={trip} />;

  return (
    <FormScreen>
      <View style={styles.header}>
        <Text variant="largeTitle">Safe Walk</Text>
        <Text variant="body" color="ink2">
          We watch your route and check on you if you stop for long, head the wrong way or run late. Scream and fall
          detection stay on while you walk.
        </Text>
      </View>
      <DestinationPicker near={position} value={destination} onChange={setDestination} />
      <View style={styles.gap}>
        <Text variant="sectionLabel" color="ink3">
          I will be there in
        </Text>
        <View style={styles.chips}>
          {ARRIVE_IN.map((m) => (
            <Chip key={String(m)} label={m ? `${m} min` : 'Auto'} selected={arriveIn === m} onPress={() => setArriveIn(m)} />
          ))}
        </View>
      </View>
      {start.error ? (
        <Text variant="footnote" color="dangerText">
          {start.error.message}
        </Text>
      ) : null}
      <Button
        label={start.isPending ? 'Starting…' : 'Start Safe Walk'}
        disabled={!destination || !position || start.isPending}
        onPress={() => start.mutate()}
      />
    </FormScreen>
  );
}

const styles = StyleSheet.create({
  header: { gap: spacing.xs },
  gap: { gap: spacing.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
});
