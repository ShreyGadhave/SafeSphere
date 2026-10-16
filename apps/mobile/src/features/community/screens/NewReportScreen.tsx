import { useMutation, useQuery } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { Camera, ImagePlus, Sparkles, X } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Image, StyleSheet, View } from 'react-native';

import { Button, Card, Chip, FormScreen, ListRow, ScalePressable, Text, TextField, Toggle } from '@/components/ui';
import { RiskMap } from '@/features/map/components/RiskMap';
import { useCurrentPosition } from '@/features/map/hooks';
import { placeName } from '@/features/map/services/mapApi';
import { colors, radius, spacing } from '@/theme';

import { CATEGORIES, categoryOf, classifyReport, type LatLng, type ReportCategory, submitReport } from '../services/communityApi';

function useDebounced<T>(value: T, ms: number): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

/** Report an incident (E1) with an AI-suggested category and urgency (E2 / ML-6). */
export function NewReportScreen() {
  const { position } = useCurrentPosition();
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<ReportCategory | null>(null);
  const [pin, setPin] = useState<LatLng | null>(null);
  const [photo, setPhoto] = useState<string | null>(null);
  const [anonymous, setAnonymous] = useState(false);
  const where = pin ?? position;

  const text = useDebounced(description, 600);
  const ai = useQuery({
    queryKey: ['classify', text],
    queryFn: () => classifyReport(text, where),
    enabled: text.trim().length >= 15,
    staleTime: Infinity,
  });
  const suggestion = ai.data ?? null;

  const submit = useMutation({
    mutationFn: async () => {
      const address = where ? await placeName(where) : null;
      await submitReport({
        category: category ?? suggestion?.category ?? 'other',
        description,
        location: where!,
        address,
        isAnonymous: anonymous,
        photoUri: photo,
        ai: suggestion,
      });
    },
    onSuccess: () => router.back(),
  });

  const pick = async (fromCamera: boolean) => {
    const opts: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 0.6, allowsEditing: true };
    if (fromCamera && !(await ImagePicker.requestCameraPermissionsAsync()).granted) return;
    const res = fromCamera ? await ImagePicker.launchCameraAsync(opts) : await ImagePicker.launchImageLibraryAsync(opts);
    if (!res.canceled && res.assets[0]) setPhoto(res.assets[0].uri);
  };

  const tooShort = description.trim().length < 10;
  const flagged = suggestion && suggestion.toxicity >= 0.7;

  return (
    <FormScreen>
      <View style={styles.header}>
        <Text variant="largeTitle">Report an incident</Text>
        <Text variant="body" color="ink2">
          A moderator reviews every report before it is shown to others. Reports also help the risk map.
        </Text>
      </View>

      <TextField
        label="What happened?"
        placeholder="e.g. Two men on a bike snatched a chain near the station exit"
        value={description}
        onChangeText={setDescription}
        multiline
        maxLength={1000}
        error={flagged ? 'This looks abusive or off-topic. Please describe what happened.' : undefined}
      />

      {suggestion && !flagged ? (
        <ScalePressable
          style={styles.suggestion}
          accessibilityLabel={`Use suggested category ${categoryOf(suggestion.category).label}`}
          onPress={() => setCategory(suggestion.category)}>
          <Sparkles size={16} color={colors.info} strokeWidth={1.8} />
          <Text variant="footnote" color="info">
            Suggested: {categoryOf(suggestion.category).label} · {suggestion.urgency} urgency
            {suggestion.duplicate_of ? ' · similar report nearby' : ''}
          </Text>
        </ScalePressable>
      ) : null}

      <View style={styles.gap}>
        <Text variant="sectionLabel" color="ink3">
          Category
        </Text>
        <View style={styles.chips}>
          {CATEGORIES.map((c) => (
            <Chip key={c.value} label={c.label} selected={(category ?? suggestion?.category) === c.value} onPress={() => setCategory(c.value)} />
          ))}
        </View>
      </View>

      <View style={styles.gap}>
        <Text variant="sectionLabel" color="ink3">
          Where (tap the map to move the pin)
        </Text>
        <View style={styles.map}>{where ? <RiskMap center={where} zoom={15} pin={where} onPress={setPin} /> : null}</View>
      </View>

      {photo ? (
        <View>
          <Image source={{ uri: photo }} style={styles.photo} accessibilityLabel="Attached photo" />
          <ScalePressable style={styles.removePhoto} accessibilityLabel="Remove photo" onPress={() => setPhoto(null)}>
            <X size={18} color={colors.white} strokeWidth={2} />
          </ScalePressable>
        </View>
      ) : (
        <View style={styles.row}>
          <View style={styles.flex}>
            <Button label="Take photo" variant="secondary" icon={Camera} onPress={() => void pick(true)} />
          </View>
          <View style={styles.flex}>
            <Button label="Gallery" variant="secondary" icon={ImagePlus} onPress={() => void pick(false)} />
          </View>
        </View>
      )}

      <Card flush>
        <ListRow
          title="Post anonymously"
          subtitle="Your name is hidden from others; moderators can still act on abuse"
          divider={false}
          accessory={<Toggle value={anonymous} onValueChange={setAnonymous} accessibilityLabel="Post anonymously" />}
        />
      </Card>

      {submit.error ? (
        <Text variant="footnote" color="dangerText">
          {submit.error.message}
        </Text>
      ) : null}
      <Button
        label={submit.isPending ? 'Sending…' : 'Submit for review'}
        disabled={tooShort || !where || !!flagged || submit.isPending}
        onPress={() => submit.mutate()}
      />
    </FormScreen>
  );
}

const styles = StyleSheet.create({
  header: { gap: spacing.xs },
  gap: { gap: spacing.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  suggestion: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    alignSelf: 'flex-start',
    backgroundColor: colors.infoTint,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  map: { height: 180, borderRadius: radius.card, overflow: 'hidden', backgroundColor: colors.fill },
  photo: { width: '100%', height: 200, borderRadius: radius.card },
  removePhoto: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(14,23,38,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  row: { flexDirection: 'row', gap: spacing.sm },
  flex: { flex: 1 },
});
