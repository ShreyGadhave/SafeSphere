import { StyleSheet, View } from 'react-native';

import { spacing } from '@/theme';

import { Text } from './Text';

type SectionHeaderProps = {
  title: string;
  /** Optional trailing note, e.g. "(optional)". */
  note?: string;
};

export function SectionHeader({ title, note }: SectionHeaderProps) {
  return (
    <View style={styles.row} accessibilityRole="header">
      <Text variant="sectionLabel" color="ink3">
        {title}
      </Text>
      {note ? (
        <Text variant="footnote" color="ink3">
          {note}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.xs, marginBottom: -spacing.xs },
});
