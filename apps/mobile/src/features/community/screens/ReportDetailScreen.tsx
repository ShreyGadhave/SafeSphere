import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Image, StyleSheet, View } from 'react-native';

import { Button, Card, FormScreen, Text, TextField } from '@/components/ui';
import { colors, radius, spacing } from '@/theme';

import { addComment, fetchComments, mediaUrl } from '../services/communityApi';

/** Comments on a report (E3). The report itself comes from the feed cache. */
export function ReportDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const qc = useQueryClient();
  const [body, setBody] = useState('');

  const report = qc
    .getQueriesData<{ id: string; description: string; mediaPath: string | null }[]>({ queryKey: ['nearbyReports'] })
    .flatMap(([, list]) => list ?? [])
    .find((r) => r.id === id);

  const photo = useQuery({
    queryKey: ['reportMedia', report?.mediaPath],
    queryFn: () => mediaUrl(report!.mediaPath!),
    enabled: !!report?.mediaPath,
  });
  const comments = useQuery({ queryKey: ['comments', id], queryFn: () => fetchComments(id) });
  const send = useMutation({
    mutationFn: () => addComment(id, body.trim()),
    onSuccess: () => {
      setBody('');
      void qc.invalidateQueries({ queryKey: ['comments', id] });
      void qc.invalidateQueries({ queryKey: ['nearbyReports'] });
    },
  });

  return (
    <FormScreen>
      {report ? (
        <Card style={styles.gap}>
          <Text variant="body">{report.description}</Text>
          {photo.data ? <Image source={{ uri: photo.data }} style={styles.photo} accessibilityLabel="Report photo" /> : null}
        </Card>
      ) : null}

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
    </FormScreen>
  );
}

const styles = StyleSheet.create({
  gap: { gap: spacing.sm },
  photo: { width: '100%', height: 220, borderRadius: radius.card },
  comment: { backgroundColor: colors.card, borderRadius: radius.card, padding: spacing.md, gap: 2 },
  mine: { backgroundColor: colors.infoTint },
});
