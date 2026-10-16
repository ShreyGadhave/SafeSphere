import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Navigation, ShieldAlert } from 'lucide-react-native';
import { Linking, StyleSheet, View } from 'react-native';

import { Button, Card, FormScreen, Text } from '@/components/ui';
import { useCurrentPosition } from '@/features/map/hooks';
import { supabase } from '@/lib/supabase';
import { colors, spacing } from '@/theme';

const TYPE: Record<string, string> = {
  unknown: 'Emergency',
  medical: 'Medical',
  accident: 'Accident',
  crime: 'Crime',
  harassment: 'Harassment',
  fire: 'Fire',
  other: 'Other',
};

function distance(m: number): string {
  return m < 1000 ? `${Math.round(m / 10) * 10} m` : `${(m / 1000).toFixed(1)} km`;
}

/** Nearby active SOS for verified guardians (F2, F3). Server limits this to 10 km and active alerts. */
export function GuardianScreen() {
  const qc = useQueryClient();
  const { position, denied } = useCurrentPosition();
  const alerts = useQuery({
    queryKey: ['guardianAlerts', position && Math.round(position.lat * 200), position && Math.round(position.lng * 200)],
    enabled: !!position,
    refetchInterval: 15_000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('nearby_active_alerts', { p_lat: position!.lat, p_lng: position!.lng, p_radius_m: 5000 });
      if (error) throw error;
      return data ?? [];
    },
  });
  const respond = useMutation({
    mutationFn: async (v: { id: string; status: 'accepted' | 'arrived'; distance: number }) => {
      const { error } = await supabase.rpc('guardian_respond', { p_alert_id: v.id, p_status: v.status, p_distance_m: v.distance });
      if (error) throw error;
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['guardianAlerts'] }),
  });

  return (
    <FormScreen>
      <View style={styles.header}>
        <Text variant="largeTitle">Nearby SOS</Text>
        <Text variant="body" color="ink2">
          People within 5 km who need help now. Only go if it is safe for you; call 112 if in doubt.
        </Text>
      </View>

      {denied ? (
        <Text variant="footnote" color="dangerText">
          Location permission is needed to find alerts near you.
        </Text>
      ) : null}
      {alerts.error ? (
        <Text variant="footnote" color="dangerText">
          {alerts.error.message}
        </Text>
      ) : null}
      {alerts.data?.length === 0 ? (
        <Card style={styles.gap}>
          <Text variant="headline">All quiet</Text>
          <Text variant="caption" color="ink3">
            No active SOS within 5 km. This list refreshes every 15 seconds.
          </Text>
        </Card>
      ) : null}

      {(alerts.data ?? []).map((a) => (
        <Card key={a.alert_id} style={styles.gap}>
          <View style={styles.row}>
            <ShieldAlert size={20} color={colors.danger} strokeWidth={1.8} />
            <Text variant="headline" style={styles.flex}>
              {TYPE[a.emergency_type] ?? 'Emergency'} · {distance(a.distance_m)}
            </Text>
            <Text variant="caption" color="ink3">
              {Math.max(1, Math.round((Date.parse(new Date().toISOString()) - Date.parse(a.created_at)) / 60_000))} min ago
            </Text>
          </View>
          <View style={styles.row}>
            <View style={styles.flex}>
              <Button
                label="I'm responding"
                variant="danger"
                disabled={respond.isPending}
                onPress={() => respond.mutate({ id: a.alert_id, status: 'accepted', distance: a.distance_m })}
              />
            </View>
            <Button
              label="Navigate"
              variant="secondary"
              icon={Navigation}
              onPress={() => void Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${a.lat},${a.lng}`)}
            />
          </View>
          <Button
            label="I've arrived"
            variant="secondary"
            onPress={() => respond.mutate({ id: a.alert_id, status: 'arrived', distance: 0 })}
          />
        </Card>
      ))}
    </FormScreen>
  );
}

const styles = StyleSheet.create({
  header: { gap: spacing.xs },
  gap: { gap: spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  flex: { flex: 1 },
});
