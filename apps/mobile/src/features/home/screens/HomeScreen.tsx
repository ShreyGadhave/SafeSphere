import { router } from 'expo-router';
import { Activity, Bell, Car, Footprints, Mic, Phone, Route, Smartphone } from 'lucide-react-native';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Card, ListRow, ScalePressable, Screen, SectionHeader, Text, Toggle } from '@/components/ui';
import { colors, fadeInUp, shadows, spacing } from '@/theme';

import { ActionTile } from '../components/ActionTile';
import { RiskRingCard } from '../components/RiskRingCard';

// TODO(phase-2): replace with live data — profile name from Supabase, risk from ML-1 (/risk) for the
// user's current H3 cell, and detector toggles from persisted settings.
const SAMPLE = {
  firstName: 'Aisha',
  risk: { score: 22, level: 'low' as const, area: 'Andheri West', detail: 'Well-lit main road · police station 600 m · updated just now' },
};

function greeting(date: Date) {
  const h = date.getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

export function HomeScreen() {
  const now = new Date();
  const [motionOn, setMotionOn] = useState(true);
  const [screamOn, setScreamOn] = useState(true);
  const [shakeOn, setShakeOn] = useState(false);

  return (
    <Screen withTabBar>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text variant="caption" color="ink3" style={styles.date}>
            {now.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
          </Text>
          <Text variant="largeTitle">{`${greeting(now)}, ${SAMPLE.firstName}`}</Text>
        </View>
        <ScalePressable accessibilityRole="button" accessibilityLabel="Notifications" style={styles.bell}>
          <Bell size={22} color={colors.ink} strokeWidth={1.8} />
        </ScalePressable>
      </View>

      <RiskRingCard {...SAMPLE.risk} />

      <SectionHeader title="Going somewhere?" />
      <View style={styles.grid}>
        <ActionTile index={0} title="Safe Ride" subtitle="Share your cab link" icon={Car} tint="infoTint" iconColor="info" onPress={() => router.push('/ride')} />
        <ActionTile index={1} title="Safest route" subtitle="Plan before you go" icon={Route} tint="safeTint" iconColor="safeText" onPress={() => router.push('/map')} />
        <ActionTile index={2} title="Safe Walk" subtitle="We'll watch your route" icon={Footprints} tint="violetTint" iconColor="violet" onPress={() => router.push('/walk')} />
        <ActionTile index={3} title="Fake call" subtitle="Ring me in 10 s" icon={Phone} tint="warningTint" iconColor="warningTextAlt" onPress={() => router.push('/fake-call')} />
      </View>

      <SectionHeader title="Always-on protection" />
      <Card flush entering={fadeInUp(5)}>
        <ListRow
          icon={Activity}
          title="Fall & snatch detection"
          subtitle="On-device AI · motion"
          accessory={<Toggle value={motionOn} onValueChange={setMotionOn} accessibilityLabel="Fall and snatch detection" />}
        />
        <ListRow
          icon={Mic}
          title="Scream detection"
          subtitle="Listens only during trips"
          accessory={<Toggle value={screamOn} onValueChange={setScreamOn} accessibilityLabel="Scream detection" />}
        />
        <ListRow
          icon={Smartphone}
          title="Shake for SOS"
          subtitle="3 quick shakes"
          divider={false}
          accessory={<Toggle value={shakeOn} onValueChange={setShakeOn} accessibilityLabel="Shake for SOS" />}
        />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md },
  headerText: { flex: 1, gap: spacing.xxs },
  date: { fontFamily: 'Figtree_500Medium', fontSize: 14 },
  bell: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.card,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: spacing.md },
});
