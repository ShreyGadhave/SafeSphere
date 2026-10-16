import { useQuery } from '@tanstack/react-query';
import { MapPin } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Card, Text, TextField } from '@/components/ui';
import { type LatLng, searchPlaces } from '@/features/map/services/mapApi';
import { colors, spacing } from '@/theme';

export type Destination = LatLng & { name: string };

type Props = {
  near: LatLng | null;
  value: Destination | null;
  onChange: (d: Destination | null) => void;
  initialQuery?: string;
};

/** Destination search (Photon / OpenStreetMap). Selecting a result fixes the destination. */
export function DestinationPicker({ near, value, onChange, initialQuery = '' }: Props) {
  const [query, setQuery] = useState(value?.name ?? initialQuery);
  const [debounced, setDebounced] = useState(query);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query.trim()), 350);
    return () => clearTimeout(t);
  }, [query]);

  const results = useQuery({
    queryKey: ['placeSearch', debounced],
    queryFn: () => searchPlaces(debounced, near),
    enabled: debounced.length >= 3 && !value,
  });

  return (
    <View style={styles.root}>
      <TextField
        label="Destination"
        placeholder="Where are you going?"
        value={query}
        onChangeText={(t) => {
          setQuery(t);
          if (value) onChange(null);
        }}
        autoCorrect={false}
        hint={value ? 'Destination set' : 'Pick a place from the list'}
      />
      {!value && results.data?.length ? (
        <Card flush>
          {results.data.slice(0, 5).map((p, i) => (
            <Pressable
              key={`${p.lat},${p.lng},${i}`}
              style={styles.row}
              accessibilityRole="button"
              onPress={() => {
                setQuery(p.name);
                onChange({ lat: p.lat, lng: p.lng, name: p.name });
              }}>
              <MapPin size={18} color={colors.ink3} strokeWidth={1.8} />
              <View style={styles.flex}>
                <Text variant="bodyStrong" numberOfLines={1}>
                  {p.name}
                </Text>
                <Text variant="caption" color="ink3" numberOfLines={1}>
                  {p.detail}
                </Text>
              </View>
            </Pressable>
          ))}
        </Card>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md },
  flex: { flex: 1 },
});
