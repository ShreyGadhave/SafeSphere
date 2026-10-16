import * as Clipboard from 'expo-clipboard';
import { router } from 'expo-router';
import { Car, ClipboardPaste } from 'lucide-react-native';
import { Alert, StyleSheet, View } from 'react-native';

import { Card, ScalePressable, Text } from '@/components/ui';
import { colors, fadeInUp, radius, spacing } from '@/theme';

import { looksLikeTripShare } from '../services/parseShare';

/** Opens Safe Ride with whatever trip text is on the clipboard (copied from Uber / Ola / Rapido). */
export async function syncCabFromClipboard(): Promise<void> {
  const text = (await Clipboard.getStringAsync().catch(() => '')).trim();
  if (!text) {
    Alert.alert(
      'Nothing copied yet',
      'In your cab app tap "Share trip status", copy it, then come back here.',
    );
    return;
  }
  if (!looksLikeTripShare(text)) {
    Alert.alert(
      'That does not look like a trip link',
      'You can still paste it in Safe Ride and fill in the details.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Open Safe Ride',
          onPress: () => router.push({ pathname: '/ride', params: { shared: text } }),
        },
      ],
    );
    return;
  }
  router.push({ pathname: '/ride', params: { shared: text } });
}

/** Small card on Home: "Paste your shared cab link to sync". */
export function CabLinkCard({ index = 0 }: { index?: number }) {
  return (
    <Card entering={fadeInUp(index)} style={styles.card}>
      <View style={styles.icon}>
        <Car size={20} color={colors.info} strokeWidth={1.8} />
      </View>
      <View style={styles.text}>
        <Text variant="bodyStrong">In a cab?</Text>
        <Text variant="caption" color="ink3">
          Copy the trip link from Uber, Ola or Rapido and paste it here to sync.
        </Text>
      </View>
      <ScalePressable
        style={styles.button}
        accessibilityRole="button"
        accessibilityLabel="Paste cab link"
        onPress={() => void syncCabFromClipboard()}
      >
        <ClipboardPaste size={16} color={colors.white} strokeWidth={2} />
        <Text variant="footnote" color="white">
          Paste
        </Text>
      </ScalePressable>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  icon: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.infoTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: { flex: 1, gap: 2 },
  button: {
    height: 38,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    backgroundColor: colors.ink,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
});
