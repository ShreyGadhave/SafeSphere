import { useMutation } from '@tanstack/react-query';
import * as Clipboard from 'expo-clipboard';
import { useLocalSearchParams } from 'expo-router';
import { ClipboardPaste } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button, Card, FormScreen, Text, TextField } from '@/components/ui';
import { useCurrentPosition } from '@/features/map/hooks';
import { spacing } from '@/theme';

import { type Destination, DestinationPicker } from '../components/DestinationPicker';
import { TripMonitor } from '../components/TripMonitor';
import { parseShareText } from '../services/parseShare';
import { startTrip } from '../services/tripEngine';
import { useActiveTrip } from '../state/tripStore';

/** Safe Ride (C3): share or paste the cab trip, confirm the details, then monitor. */
export function RideScreen() {
  const trip = useActiveTrip();
  if (trip) return <TripMonitor trip={trip} />;
  return <RideSetup />;
}

function RideSetup() {
  const params = useLocalSearchParams<{ shared?: string }>();
  const { position } = useCurrentPosition();
  const [shareText, setShareText] = useState(params.shared ?? '');
  const parsed = useMemo(() => parseShareText(shareText), [shareText]);
  // Parsed values are suggestions; the user can correct them. Never invented.
  const [driver, setDriver] = useState<string | null>(null);
  const [plate, setPlate] = useState<string | null>(null);
  const [destination, setDestination] = useState<Destination | null>(null);

  const start = useMutation({
    mutationFn: () =>
      startTrip({
        mode: 'ride',
        origin: position!,
        destination: destination!,
        shareText: shareText || null,
        cab: {
          provider: parsed.provider,
          driverName: (driver ?? parsed.driverName) || null,
          plate: (plate ?? parsed.plate) || null,
          vehicle: parsed.vehicle,
        },
      }),
  });

  const paste = async () => setShareText(await Clipboard.getStringAsync());

  return (
    <FormScreen>
      <View style={styles.header}>
        <Text variant="largeTitle">Safe Ride</Text>
        <Text variant="body" color="ink2">
          Share your trip from Uber, Ola or Rapido to SafeSphere, or paste it here. We watch the ride and check on
          you if anything looks wrong.
        </Text>
      </View>
      <Card style={styles.gap}>
        <TextField
          label="Trip details from your cab app"
          placeholder="Paste the shared trip text or link"
          value={shareText}
          onChangeText={setShareText}
          multiline
        />
        <Button label="Paste from clipboard" variant="secondary" icon={ClipboardPaste} onPress={() => void paste()} />
      </Card>

      {shareText ? (
        <Card style={styles.gap}>
          <Text variant="sectionLabel" color="ink3">
            Found in the text{parsed.provider ? ` · ${parsed.provider}` : ''}
          </Text>
          <TextField
            label="Driver"
            placeholder="Not in the text — add if you know it"
            value={driver ?? parsed.driverName ?? ''}
            onChangeText={setDriver}
          />
          <TextField
            label="Number plate"
            placeholder="e.g. MH 02 EK 4471"
            autoCapitalize="characters"
            value={plate ?? parsed.plate ?? ''}
            onChangeText={setPlate}
          />
          {parsed.vehicle ? (
            <Text variant="caption" color="ink3">
              Vehicle: {parsed.vehicle}
            </Text>
          ) : null}
        </Card>
      ) : null}

      <DestinationPicker
        key={parsed.destination ?? 'none'}
        near={position}
        value={destination}
        onChange={setDestination}
        initialQuery={parsed.destination ?? ''}
      />

      {start.error ? (
        <Text variant="footnote" color="dangerText">
          {start.error.message}
        </Text>
      ) : null}
      <View style={styles.gap}>
        <Button
          label={start.isPending ? 'Starting…' : 'Start watching my ride'}
          disabled={!destination || !position || start.isPending}
          onPress={() => start.mutate()}
        />
        {!position ? (
          <Text variant="caption" color="ink3" align="center">
            Waiting for your location…
          </Text>
        ) : null}
      </View>
    </FormScreen>
  );
}

const styles = StyleSheet.create({ gap: { gap: spacing.md }, header: { gap: spacing.xs } });
