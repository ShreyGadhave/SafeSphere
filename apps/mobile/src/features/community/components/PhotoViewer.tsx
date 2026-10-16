import { X } from 'lucide-react-native';
import { Image, Modal, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ScalePressable } from '@/components/ui';
import { colors, spacing } from '@/theme';

type Props = { uri: string | null; onClose: () => void };

/** Full-screen view of a report photo; tap the X or the back button to close. */
export function PhotoViewer({ uri, onClose }: Props) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={!!uri} transparent animationType="fade" statusBarTranslucent onRequestClose={onClose}>
      <View style={styles.root}>
        {uri ? <Image source={{ uri }} style={styles.image} resizeMode="contain" accessibilityLabel="Report photo, full size" /> : null}
        <ScalePressable
          style={[styles.close, { top: insets.top + spacing.md }]}
          accessibilityRole="button"
          accessibilityLabel="Close photo"
          onPress={onClose}>
          <X size={22} color={colors.white} strokeWidth={2} />
        </ScalePressable>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000000', justifyContent: 'center' },
  image: { width: '100%', height: '100%' },
  close: {
    position: 'absolute',
    right: spacing.gutter,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
