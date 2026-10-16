import { router } from 'expo-router';
import { Activity, Bell, Car, Footprints, Mic, Phone, Route, ShieldCheck, Smartphone } from 'lucide-react-native';
import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { Card, ListRow, ScalePressable, Screen, SectionHeader, Text, Toggle } from '@/components/ui';
import { useDetection } from '@/features/detection';
import { CabLinkCard } from '@/features/ride/components/CabLinkCard';
import { useAreaRisk, useCurrentPosition, riskLevel, slotFor } from '@/features/map';
import { useProfile, useSafetySettings } from '@/features/profile';
import { colors, fadeInUp, shadows, spacing } from '@/theme';

import { ActionTile } from '../components/ActionTile';
import { RiskRingCard } from '../components/RiskRingCard';

function greeting(date: Date) {
  const h = date.getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

export function HomeScreen() {
  const now = new Date();
  const profile = useProfile();
  const { settings, update } = useSafetySettings();
  const detection = useDetection();
  const listeningLabel =
    [detection.listening.audio && 'listening for screams', detection.listening.motion && 'watching for falls']
      .filter(Boolean)
      .join(' · ') || 'Turn on to arm scream and fall detection now';
  const { position, denied } = useCurrentPosition();
  const slot = useMemo(() => slotFor(), []);
  const area = useAreaRisk(position, slot);
  const firstName = profile.data?.full_name?.split(' ')[0] ?? '';
  const cell = area.data?.cell ?? null;
  const reasons = cell?.reasons.slice(0, 2).map((r) => r.label).join(' · ');

  return (
    <Screen withTabBar>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text variant="caption" color="ink3" style={styles.date}>
            {now.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
          </Text>
          <Text variant="largeTitle">{firstName ? `${greeting(now)}, ${firstName}` : greeting(now)}</Text>
        </View>
        <ScalePressable accessibilityRole="button" accessibilityLabel="Notifications" style={styles.bell}>
          <Bell size={22} color={colors.ink} strokeWidth={1.8} />
        </ScalePressable>
      </View>

      {cell ? (
        <RiskRingCard
          score={Math.round(cell.score)}
          level={riskLevel(cell.score)}
          area={area.data?.name ?? 'Your area'}
          detail={reasons ? `${reasons} · updated just now` : 'Updated just now'}
        />
      ) : (
        <Card entering={fadeInUp(0)}>
          <Text variant="headline">Area risk</Text>
          <Text variant="caption" color="ink3">
            {denied
              ? 'Allow location to see how safe your area is right now.'
              : area.isFetching || !position
                ? 'Checking your area…'
                : 'Risk scores cover Mumbai, Navi Mumbai, Delhi and Pune.'}
          </Text>
        </Card>
      )}

      <CabLinkCard index={1} />

      <SectionHeader title="Going somewhere?" />
      <View style={styles.grid}>
        <ActionTile index={0} title="Safe Ride" subtitle="Share your cab link" icon={Car} tint="infoTint" iconColor="info" onPress={() => router.push('/ride')} />
        <ActionTile index={1} title="Safest route" subtitle="Plan before you go" icon={Route} tint="safeTint" iconColor="safeText" onPress={() => router.push('/route-planner')} />
        <ActionTile index={2} title="Safe Walk" subtitle="We'll watch your route" icon={Footprints} tint="violetTint" iconColor="violet" onPress={() => router.push('/walk')} />
        <ActionTile index={3} title="Fake call" subtitle="Ring me in 10 s" icon={Phone} tint="warningTint" iconColor="warningTextAlt" onPress={() => router.push('/fake-call')} />
      </View>

      <SectionHeader title="Always-on protection" />
      <Card flush entering={fadeInUp(5)}>
        <ListRow
          icon={ShieldCheck}
          title="Guard mode"
          subtitle={detection.guardMode ? listeningLabel : 'Turn on to arm scream and fall detection now'}
          accessory={
            <Toggle value={detection.guardMode} onValueChange={detection.setGuardMode} accessibilityLabel="Guard mode" />
          }
        />
        <ListRow
          icon={Activity}
          title="Fall & snatch detection"
          subtitle="On-device AI · motion"
          accessory={<Toggle value={settings.fallDetection} onValueChange={(v) => void update({ fallDetection: v })} accessibilityLabel="Fall and snatch detection" />}
        />
        <ListRow
          icon={Mic}
          title="Scream detection"
          subtitle="Listens only during trips"
          accessory={<Toggle value={settings.screamDetection} onValueChange={(v) => void update({ screamDetection: v })} accessibilityLabel="Scream detection" />}
        />
        <ListRow
          icon={Smartphone}
          title="Shake for SOS"
          subtitle="3 quick shakes"
          divider={false}
          accessory={<Toggle value={settings.shake} onValueChange={(v) => void update({ shake: v })} accessibilityLabel="Shake for SOS" />}
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
