import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { Avatar, Chip, ScalePressable, Screen, Text } from '@/components/ui';
import { colors, fadeInUp, radius, spacing } from '@/theme';

import { Helplines } from '../components/Helplines';
import { HoldToSosButton } from '../components/HoldToSosButton';
import { EMERGENCY_TYPES, type EmergencyType } from '../constants';
import { readCachedRecipients, refreshSosRecipients, type SosContact } from '../services/recipients';
import { useSos } from '../state/SosProvider';

export function SosScreen() {
  const { phase, trigger$ } = useSos();
  const [type, setType] = useState<EmergencyType>('unknown');
  const [contacts, setContacts] = useState<SosContact[]>([]);

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      void readCachedRecipients().then((r) => alive && setContacts(r.contacts));
      void refreshSosRecipients().then((r) => alive && setContacts(r.contacts));
      return () => {
        alive = false;
      };
    }, []),
  );

  const sosRunning = phase === 'active';

  return (
    <Screen withTabBar>
      <Animated.View entering={fadeInUp(0)} style={styles.header}>
        <Text variant="largeTitle" style={styles.title}>
          Emergency
        </Text>
        <Text variant="body" color="ink2">
          Press and hold for 3 seconds. You’ll get 5 seconds to cancel.
        </Text>
      </Animated.View>

      {sosRunning ? (
        <ScalePressable
          accessibilityRole="button"
          onPress={() => router.push('/sos-active')}
          style={styles.activeBanner}>
          <Text variant="bodyStrong" color="dangerText">
            SOS is active
          </Text>
          <Text variant="subhead" color="dangerText">
            Open
          </Text>
        </ScalePressable>
      ) : null}

      <View style={styles.buttonWrap}>
        <HoldToSosButton
          disabled={sosRunning}
          onComplete={() => trigger$({ source: 'button', type, requireConfirm: false })}
        />
      </View>

      <Animated.View entering={fadeInUp(1)} style={styles.section}>
        <Text variant="sectionLabel" color="ink3">
          What’s happening? (optional)
        </Text>
        <View style={styles.chips}>
          {EMERGENCY_TYPES.map((t) => (
            <Chip
              key={t.value}
              label={t.label}
              selected={type === t.value}
              onPress={() => setType(type === t.value ? 'unknown' : t.value)}
            />
          ))}
        </View>
      </Animated.View>

      <Animated.View entering={fadeInUp(2)} style={styles.section}>
        <Text variant="sectionLabel" color="ink3">
          Or call directly
        </Text>
        <Helplines />
      </Animated.View>

      <Animated.View entering={fadeInUp(3)} style={styles.recipients}>
        {contacts.length ? (
          <>
            <View style={styles.avatars}>
              {contacts.slice(0, 3).map((c, i) => (
                <View key={c.phone} style={i > 0 && styles.overlap}>
                  <Avatar name={c.name} size={28} index={i} />
                </View>
              ))}
            </View>
            <Text variant="caption" color="ink2" style={styles.flex}>
              {contacts.length} contact{contacts.length === 1 ? '' : 's'} and nearby guardians will be alerted
            </Text>
          </>
        ) : (
          <Text variant="caption" color="dangerText" style={styles.flex}>
            No emergency contacts yet. Add them in Profile so the SOS can reach someone.
          </Text>
        )}
      </Animated.View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { gap: spacing.xs + 2 },
  title: { fontSize: 32, lineHeight: 38 },
  activeBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.dangerTint,
    borderRadius: radius.button,
    paddingHorizontal: spacing.lg,
    minHeight: 48,
  },
  buttonWrap: { alignItems: 'center', marginVertical: spacing.sm },
  section: { gap: spacing.md - 2 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  recipients: { flexDirection: 'row', alignItems: 'center', gap: spacing.md - 2 },
  avatars: { flexDirection: 'row' },
  overlap: { marginLeft: -8 },
  flex: { flex: 1 },
});
