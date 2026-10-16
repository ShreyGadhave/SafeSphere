import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Plus } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, Card, ScalePressable, Text } from '@/components/ui';
import { useCurrentPosition } from '@/features/map/hooks';
import { MUMBAI } from '@/features/map/components/RiskMap';
import { colors, layout, radius, spacing } from '@/theme';

import { ReportCard } from '../components/ReportCard';
import { type FeedReport, fetchNearbyReports, setConfirmed } from '../services/communityApi';

const SCOPES = [
  { label: 'Nearby', radiusM: 5_000 },
  { label: 'My city', radiusM: 50_000 },
] as const;

/** Community feed (E3): reviewed reports near you, newest first. */
export function CommunityScreen() {
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const { position } = useCurrentPosition();
  const [scope, setScope] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  const center = position ?? MUMBAI;
  const key = ['nearbyReports', Math.round(center.lat * 100), Math.round(center.lng * 100), scope];

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(t);
  }, []);

  const feed = useQuery({ queryKey: key, queryFn: () => fetchNearbyReports(center, SCOPES[scope].radiusM) });

  const confirm = useMutation({
    mutationFn: (r: FeedReport) => setConfirmed(r.id, !r.confirmedByMe),
    onMutate: async (r) => {
      // Optimistic toggle; rolled back on error.
      await qc.cancelQueries({ queryKey: key });
      const prev = qc.getQueryData<FeedReport[]>(key);
      qc.setQueryData<FeedReport[]>(key, (list) =>
        list?.map((x) =>
          x.id === r.id ? { ...x, confirmedByMe: !x.confirmedByMe, confirmations: x.confirmations + (x.confirmedByMe ? -1 : 1) } : x,
        ),
      );
      return { prev };
    },
    onError: (_e, _r, ctx) => ctx?.prev && qc.setQueryData(key, ctx.prev),
  });

  return (
    <View style={[styles.root, { paddingTop: insets.top + spacing.lg }]}>
      <View style={styles.header}>
        <View style={styles.flex}>
          <Text variant="largeTitle">Community</Text>
          <Text variant="caption" color="ink3">
            Reviewed reports from people near you
          </Text>
        </View>
        <Button label="Report" icon={Plus} onPress={() => router.push('/report/new')} />
      </View>

      <View style={styles.segment} accessibilityRole="tablist">
        {SCOPES.map((s, i) => (
          <ScalePressable
            key={s.label}
            accessibilityRole="tab"
            accessibilityState={{ selected: scope === i }}
            style={[styles.segmentItem, scope === i && styles.segmentOn]}
            onPress={() => setScope(i)}>
            <Text variant={scope === i ? 'bodyStrong' : 'body'} color={scope === i ? 'ink' : 'ink2'}>
              {s.label}
            </Text>
          </ScalePressable>
        ))}
      </View>

      <FlatList
        data={feed.data ?? []}
        keyExtractor={(r) => r.id}
        contentContainerStyle={[styles.list, { paddingBottom: layout.tabBarHeight + spacing.xl }]}
        refreshControl={<RefreshControl refreshing={feed.isRefetching} onRefresh={() => void feed.refetch()} />}
        renderItem={({ item, index }) => (
          <ReportCard report={item} index={index} now={now} onToggleConfirm={() => confirm.mutate(item)} />
        )}
        ListEmptyComponent={
          <Card style={styles.empty}>
            <Text variant="headline">{feed.isPending ? 'Loading reports…' : feed.isError ? 'Could not load reports' : 'All quiet here'}</Text>
            <Text variant="caption" color="ink3">
              {feed.isError
                ? 'Pull down to try again.'
                : 'No reviewed reports in this area yet. If you see something unsafe, report it.'}
            </Text>
          </Card>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.ground },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.lg },
  flex: { flex: 1 },
  segment: {
    flexDirection: 'row',
    backgroundColor: colors.fillStrong,
    borderRadius: radius.md,
    padding: 3,
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
  },
  segmentItem: { flex: 1, height: 34, borderRadius: radius.md - 2, alignItems: 'center', justifyContent: 'center' },
  segmentOn: { backgroundColor: colors.card },
  list: { padding: spacing.lg, gap: spacing.md },
  empty: { gap: spacing.xs },
});
