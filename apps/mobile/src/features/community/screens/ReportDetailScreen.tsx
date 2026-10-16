import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { ChevronLeft, CircleCheck, Clock, Expand, MapPin, UserRound } from 'lucide-react-native';
import { useState } from 'react';
import { Image, StyleSheet, View } from 'react-native';

import { Button, Card, FormScreen, ScalePressable, Text, TextField } from '@/components/ui';
import { colors, radius, spacing } from '@/theme';

import { PhotoViewer } from '../components/PhotoViewer';
import { timeAgo } from '../components/ReportCard';
import { useReportPhoto } from '../hooks/useReportPhoto';
import { addComment, categoryOf, fetchComments, type FeedReport } from '../services/communityApi';

const URGENCY = {
  high: { label: 'High urgency', bg: colors.dangerTint, fg: 'dangerText' },
  medium: { label: 'Medium urgency', bg: colors.warningTint, fg: 'warningText' },
  low: { label: 'Low urgency', bg: colors.fill, fg: 'ink2' },
} as const;

function distance(m: number): string {
  return m < 1000 ? `${Math.round(m / 10) * 10} m away` : `${(m / 1000).toFixed(1)} km away`;
}

function MetaRow({ icon: Icon, text }: { icon: typeof MapPin; text: string }) {
  return (
    <View style={styles.metaRow}>
      <Icon size={16} color={colors.ink3} strokeWidth={1.8} />
      <Text variant="caption" color="ink2" style={styles.flex}>
        {text}
      </Text>
    </View>
  );
}

/** Full community report with its photo and comments (E3). The report itself comes from the feed cache. */
export function ReportDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const qc = useQueryClient();
  const [body, setBody] = useState('');
  const [viewing, setViewing] = useState(false);
  const [now] = useState(() => Date.now());

  const report = qc
    .getQueriesData<FeedReport[]>({ queryKey: ['nearbyReports'] })
    .flatMap(([, list]) => list ?? [])
    .find((r) => r.id === id);

  const photo = useReportPhoto(report?.mediaPath);
  const comments = useQuery({ queryKey: ['comments', id], queryFn: () => fetchComments(id) });
  const send = useMutation({
    mutationFn: () => addComment(id, body.trim()),
    onSuccess: () => {
      setBody('');
      void qc.invalidateQueries({ queryKey: ['comments', id] });
      void qc.invalidateQueries({ queryKey: ['nearbyReports'] });
    },
  });

  const cat = report ? categoryOf(report.category) : null;
  const urgency = report?.urgency ? URGENCY[report.urgency] : null;

  return (
    <FormScreen>
      <View style={styles.header}>
        <ScalePressable
          style={styles.back}
          accessibilityRole="button"
          accessibilityLabel="Back"
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/community'))}>
          <ChevronLeft size={24} color={colors.ink} strokeWidth={1.8} />
        </ScalePressable>
        <Text variant="title">Report</Text>
      </View>

      {report && cat ? (
        <Card style={styles.gap}>
          <View style={styles.top}>
            <View style={styles.cat}>
              <View style={[styles.dot, { backgroundColor: cat.color }]} />
              <Text variant="subhead">{cat.label}</Text>
            </View>
            {urgency ? (
              <View style={[styles.badge, { backgroundColor: urgency.bg }]}>
                <Text variant="caption" color={urgency.fg}>
                  {urgency.label}
                </Text>
              </View>
            ) : null}
          </View>

          <Text variant="body">{report.description}</Text>

          {report.mediaPath ? (
            <ScalePressable
              style={styles.photoWrap}
              accessibilityRole="imagebutton"
              accessibilityLabel="Report photo. Tap to view full size"
              disabled={!photo.data}
              onPress={() => setViewing(true)}>
              {photo.data ? <Image source={{ uri: photo.data }} style={styles.photo} resizeMode="cover" /> : null}
              {photo.data ? (
                <View style={styles.expand}>
                  <Expand size={16} color={colors.white} strokeWidth={2} />
                </View>
              ) : (
                <Text variant="caption" color="ink3">
                  {photo.isError ? 'Photo could not be loaded' : 'Loading photo…'}
                </Text>
              )}
            </ScalePressable>
          ) : null}

          <View style={styles.meta}>
            <MetaRow icon={MapPin} text={[report.address, distance(report.distanceM)].filter(Boolean).join(' · ')} />
            <MetaRow
              icon={Clock}
              text={`${new Date(report.createdAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })} · ${timeAgo(report.createdAt, now)}`}
            />
            <MetaRow icon={UserRound} text={`Reported by ${report.author ?? 'Anonymous'}`} />
            <MetaRow
              icon={CircleCheck}
              text={report.confirmations === 1 ? '1 person saw this too' : `${report.confirmations} people saw this too`}
            />
          </View>
        </Card>
      ) : (
        <Text variant="caption" color="ink3">
          This report is no longer in your feed. Pull to refresh the Community tab.
        </Text>
      )}

      <Text variant="sectionLabel" color="ink3">
        Comments
      </Text>
      {(comments.data ?? []).map((c) => (
        <View key={c.id} style={[styles.comment, c.mine && styles.mine]}>
          <Text variant="body">{c.body}</Text>
          <Text variant="caption" color="ink3">
            {c.mine ? 'You' : 'Someone nearby'} · {new Date(c.createdAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
          </Text>
        </View>
      ))}
      {comments.data?.length === 0 ? (
        <Text variant="caption" color="ink3">
          No comments yet.
        </Text>
      ) : null}

      <TextField label="Add a comment" placeholder="Share useful details" value={body} onChangeText={setBody} maxLength={500} multiline />
      {send.error ? (
        <Text variant="footnote" color="dangerText">
          {send.error.message}
        </Text>
      ) : null}
      <Button label={send.isPending ? 'Posting…' : 'Post comment'} disabled={!body.trim() || send.isPending} onPress={() => send.mutate()} />

      <PhotoViewer uri={viewing ? (photo.data ?? null) : null} onClose={() => setViewing(false)} />
    </FormScreen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  back: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center' },
  gap: { gap: spacing.md },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cat: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  dot: { width: 8, height: 8, borderRadius: 4 },
  badge: { paddingHorizontal: spacing.sm, paddingVertical: 3, borderRadius: radius.sm },
  photoWrap: {
    height: 240,
    borderRadius: radius.card,
    overflow: 'hidden',
    backgroundColor: colors.fill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photo: StyleSheet.absoluteFill,
  expand: {
    position: 'absolute',
    right: spacing.sm,
    bottom: spacing.sm,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(14,23,38,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  meta: { gap: spacing.sm, paddingTop: spacing.sm, borderTopWidth: 1, borderTopColor: colors.divider },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  flex: { flex: 1 },
  comment: { backgroundColor: colors.card, borderRadius: radius.card, padding: spacing.md, gap: 2 },
  mine: { backgroundColor: colors.infoTint },
});
