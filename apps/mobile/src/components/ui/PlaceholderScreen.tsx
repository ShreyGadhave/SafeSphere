import { StyleSheet, View } from 'react-native';

import { fadeInUp, spacing } from '@/theme';

import { Card } from './Card';
import { Screen } from './Screen';
import { Text } from './Text';

type PlaceholderScreenProps = {
  title: string;
  description: string;
  /** Bullet list of what this screen will contain once built. */
  planned?: string[];
  withTabBar?: boolean;
};

/** Phase 0 stand-in for screens that are routed but not built yet. */
export function PlaceholderScreen({ title, description, planned = [], withTabBar = false }: PlaceholderScreenProps) {
  return (
    <Screen withTabBar={withTabBar}>
      <View style={styles.header}>
        <Text variant="largeTitle">{title}</Text>
        <Text variant="body" color="ink2">
          {description}
        </Text>
      </View>
      {planned.length > 0 ? (
        <Card entering={fadeInUp()} style={styles.card}>
          <Text variant="sectionLabel" color="ink3">
            Coming in this screen
          </Text>
          {planned.map((item) => (
            <Text key={item} variant="subhead" color="ink2">
              {`•  ${item}`}
            </Text>
          ))}
        </Card>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { gap: spacing.xs },
  card: { gap: spacing.sm },
});
