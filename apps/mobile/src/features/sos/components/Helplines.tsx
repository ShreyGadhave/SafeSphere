import { ChevronDown, Phone } from 'lucide-react-native';
import { useState } from 'react';
import { Linking, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, LinearTransition } from 'react-native-reanimated';

import { ScalePressable, Text } from '@/components/ui';
import { colors, radius, spacing } from '@/theme';

import { MORE_HELPLINES, PRIMARY_HELPLINES, type Helpline } from '../constants';

function dial(number: string) {
  // Emergency numbers always open the dialer (Android won't let apps auto-dial them).
  void Linking.openURL(`tel:${number}`);
}

/** B11: one-tap helplines — 112 / 100 / 108 / 1091 plus an expandable list. */
export function Helplines() {
  const [expanded, setExpanded] = useState(false);

  return (
    <Animated.View layout={LinearTransition} style={styles.root}>
      <View style={styles.grid}>
        {PRIMARY_HELPLINES.map((h) => (
          <ScalePressable
            key={h.number}
            accessibilityRole="button"
            accessibilityLabel={`Call ${h.number}, ${h.description}`}
            onPress={() => dial(h.number)}
            style={styles.tile}>
            <Text style={styles.number}>{h.number}</Text>
            <Text variant="footnote" color="ink3">
              {h.label}
            </Text>
          </ScalePressable>
        ))}
      </View>

      <ScalePressable
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        onPress={() => setExpanded((e) => !e)}
        style={styles.moreToggle}>
        <Text variant="subhead" color="ink2">
          {expanded ? 'Fewer helplines' : 'More helplines'}
        </Text>
        <ChevronDown
          size={18}
          color={colors.ink2}
          strokeWidth={1.8}
          style={{ transform: [{ rotate: expanded ? '180deg' : '0deg' }] }}
        />
      </ScalePressable>

      {expanded ? (
        <Animated.View entering={FadeIn.duration(200)} style={styles.list}>
          {MORE_HELPLINES.map((h: Helpline, i) => (
            <ScalePressable
              key={h.number}
              accessibilityRole="button"
              accessibilityLabel={`Call ${h.number}, ${h.description}`}
              onPress={() => dial(h.number)}
              style={[styles.row, i < MORE_HELPLINES.length - 1 && styles.rowDivider]}>
              <Text style={styles.rowNumber}>{h.number}</Text>
              <Text variant="subhead" style={styles.rowLabel}>
                {h.description}
              </Text>
              <Phone size={18} color={colors.ink2} strokeWidth={1.8} />
            </ScalePressable>
          ))}
        </Animated.View>
      ) : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: { gap: spacing.sm },
  grid: { flexDirection: 'row', gap: spacing.sm },
  tile: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: radius.button,
    paddingVertical: spacing.md,
    alignItems: 'center',
    gap: 2,
  },
  number: { fontFamily: 'Figtree_800ExtraBold', fontSize: 20, lineHeight: 24, color: colors.ink },
  moreToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    minHeight: 44,
  },
  list: { backgroundColor: colors.card, borderRadius: radius.card, paddingHorizontal: spacing.lg },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: 52 },
  rowDivider: { borderBottomWidth: 1, borderBottomColor: colors.divider },
  rowNumber: { fontFamily: 'Figtree_800ExtraBold', fontSize: 17, width: 52, color: colors.ink },
  rowLabel: { flex: 1 },
});
