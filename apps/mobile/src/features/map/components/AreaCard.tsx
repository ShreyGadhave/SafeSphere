import { router } from 'expo-router';
import { ChevronLeft, Navigation, Shield } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { Button, Card, ScalePressable, Text } from '@/components/ui';
import { colors, fadeInUp, spacing } from '@/theme';

import { type LatLng, type RiskCell, riskLevel, type SafePlace } from '../services/mapApi';

const LEVEL = {
  low: { bg: colors.safeTint, fg: 'safeText', label: 'LOW' },
  medium: { bg: colors.warningTint, fg: 'warningText', label: 'MEDIUM' },
  high: { bg: colors.dangerTint, fg: 'dangerText', label: 'HIGH' },
} as const;

type AreaCardProps = {
  point: LatLng;
  name: string;
  cell: RiskCell | null;
  loading: boolean;
  slotLabel: string;
  nearestPolice?: SafePlace;
  /** Closes the card so the map can be explored. */
  onClose?: () => void;
};

function formatDistance(m: number): string {
  return m < 1000 ? `${Math.round(m / 10) * 10} m` : `${(m / 1000).toFixed(1)} km`;
}

/** Bottom card for the tapped/current point: ML-1 score, its SHAP reasons and quick actions. */
export function AreaCard({ point, name, cell, loading, slotLabel, nearestPolice, onClose }: AreaCardProps) {
  const level = cell ? LEVEL[riskLevel(cell.score)] : null;
  const maxImpact = Math.max(1, ...(cell?.reasons ?? []).map((r) => Math.abs(r.impact)));

  return (
    <Animated.View entering={fadeInUp(0)}>
      <Card style={styles.card}>
        <View style={styles.header}>
          {onClose ? (
            <ScalePressable style={styles.back} accessibilityRole="button" accessibilityLabel="Back to map" onPress={onClose}>
              <ChevronLeft size={24} color={colors.ink} strokeWidth={2} />
            </ScalePressable>
          ) : null}
          <View style={styles.headerText}>
            <Text variant="headline" numberOfLines={1}>
              {name}
            </Text>
            <Text variant="caption" color="ink3">
              {cell ? `Predicted risk · ${slotLabel}` : loading ? 'Checking this area…' : 'No risk data for this spot yet'}
            </Text>
          </View>
          {cell && level ? (
            <View style={[styles.badge, { backgroundColor: level.bg }]} accessibilityLabel={`Risk ${Math.round(cell.score)} of 100`}>
              <Text variant="title" color={level.fg}>
                {Math.round(cell.score)}
              </Text>
              <Text variant="tabLabel" color={level.fg}>
                {level.label}
              </Text>
            </View>
          ) : null}
        </View>

        {cell?.reasons.length ? (
          <View style={styles.reasons}>
            <Text variant="sectionLabel" color="ink3">
              Why this score
            </Text>
            {cell.reasons.map((r) => (
              <View key={r.label} style={styles.reasonRow}>
                <Text variant="subhead" style={styles.reasonLabel} numberOfLines={1}>
                  {r.label}
                </Text>
                <View style={styles.track}>
                  <View
                    style={[
                      styles.bar,
                      {
                        width: `${(Math.abs(r.impact) / maxImpact) * 100}%`,
                        backgroundColor: r.impact >= 0 ? colors.danger : colors.safe,
                      },
                    ]}
                  />
                </View>
                <Text variant="footnote" color={r.impact >= 0 ? 'dangerText' : 'safeText'} style={styles.impact}>
                  {r.impact >= 0 ? `+${r.impact}` : `−${Math.abs(r.impact)}`}
                </Text>
              </View>
            ))}
          </View>
        ) : null}

        {nearestPolice ? (
          <View style={styles.police}>
            <Shield size={16} color={colors.info} strokeWidth={1.8} />
            <Text variant="footnote" color="ink2" numberOfLines={1}>
              Nearest police: {nearestPolice.name ?? 'Police station'} · {formatDistance(nearestPolice.distanceM)}
            </Text>
          </View>
        ) : null}

        <View style={styles.actions}>
          <View style={styles.flex}>
            <Button
              label="Safest route here"
              icon={Navigation}
              onPress={() =>
                router.push({
                  pathname: '/route-planner',
                  params: { lat: String(point.lat), lng: String(point.lng), name },
                })
              }
            />
          </View>
          <Button label="Report" variant="secondary" onPress={() => router.push('/report/new')} />
        </View>
      </Card>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.md },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  back: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.fill, alignItems: 'center', justifyContent: 'center' },
  headerText: { flex: 1, gap: 2 },
  badge: { width: 62, height: 62, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  reasons: { gap: spacing.sm },
  reasonRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  reasonLabel: { flex: 1 },
  track: { width: 88, height: 6, borderRadius: 3, backgroundColor: colors.fill, overflow: 'hidden' },
  bar: { height: '100%', borderRadius: 3 },
  impact: { width: 34, textAlign: 'right' },
  police: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  actions: { flexDirection: 'row', gap: spacing.sm },
  flex: { flex: 1 },
});

