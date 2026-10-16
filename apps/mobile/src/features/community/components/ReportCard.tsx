import { router } from 'expo-router';
import { CircleCheck, MapPin, MessageSquare } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { Card, ScalePressable, Text } from '@/components/ui';
import { colors, fadeInUp, radius, spacing } from '@/theme';

import { categoryOf, type FeedReport } from '../services/communityApi';

const URGENCY = {
  high: { label: 'High urgency', bg: colors.dangerTint, fg: 'dangerText' },
  medium: { label: 'Medium', bg: colors.warningTint, fg: 'warningText' },
  low: { label: 'Low', bg: colors.fill, fg: 'ink2' },
} as const;

export function timeAgo(iso: string, now: number): string {
  const m = Math.max(0, Math.round((now - new Date(iso).getTime()) / 60_000));
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  return h < 24 ? `${h} h ago` : `${Math.round(h / 24)} d ago`;
}

function distance(m: number): string {
  return m < 1000 ? `${Math.round(m / 10) * 10} m` : `${(m / 1000).toFixed(1)} km`;
}

type Props = {
  report: FeedReport;
  index: number;
  now: number;
  onToggleConfirm: () => void;
};

/** One community report in the feed (E3). */
export function ReportCard({ report: r, index, now, onToggleConfirm }: Props) {
  const cat = categoryOf(r.category);
  const urgency = r.urgency ? URGENCY[r.urgency] : null;
  return (
    <Animated.View entering={fadeInUp(index)}>
      <ScalePressable
        accessibilityRole="button"
        accessibilityLabel={`${cat.label} report: ${r.description}`}
        onPress={() => router.push({ pathname: '/report/[id]', params: { id: r.id } })}>
        <Card style={styles.card}>
          <View style={styles.top}>
            <View style={styles.cat}>
              <View style={[styles.dot, { backgroundColor: cat.color }]} />
              <Text variant="footnote">{cat.label}</Text>
            </View>
            {urgency ? (
              <View style={[styles.badge, { backgroundColor: urgency.bg }]}>
                <Text variant="caption" color={urgency.fg}>
                  {urgency.label}
                </Text>
              </View>
            ) : null}
          </View>
          <Text variant="body">{r.description}</Text>
          <View style={styles.meta}>
            <MapPin size={14} color={colors.ink3} strokeWidth={1.8} />
            <Text variant="caption" color="ink3" numberOfLines={1} style={styles.flex}>
              {[r.address, distance(r.distanceM), timeAgo(r.createdAt, now), r.author ?? 'Anonymous'].filter(Boolean).join(' · ')}
            </Text>
          </View>
          <View style={styles.actions}>
            <ScalePressable
              style={[styles.action, styles.flex, r.confirmedByMe && styles.actionOn]}
              accessibilityRole="button"
              accessibilityState={{ selected: r.confirmedByMe }}
              accessibilityLabel={`I saw this too, ${r.confirmations} confirmations`}
              onPress={onToggleConfirm}>
              <CircleCheck size={16} color={r.confirmedByMe ? colors.white : colors.ink} strokeWidth={1.8} />
              <Text variant="footnote" color={r.confirmedByMe ? 'white' : 'ink'}>
                I saw this too · {r.confirmations}
              </Text>
            </ScalePressable>
            <View style={styles.action}>
              <MessageSquare size={16} color={colors.ink} strokeWidth={1.8} />
              <Text variant="footnote">{r.commentCount}</Text>
            </View>
          </View>
        </Card>
      </ScalePressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.sm },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cat: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  dot: { width: 8, height: 8, borderRadius: 4 },
  badge: { paddingHorizontal: spacing.sm, paddingVertical: 3, borderRadius: radius.sm },
  meta: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  actions: { flexDirection: 'row', gap: spacing.sm, paddingTop: spacing.sm, borderTopWidth: 1, borderTopColor: colors.divider },
  action: {
    height: 38,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.ground,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  actionOn: { backgroundColor: colors.ink },
  flex: { flex: 1 },
});
