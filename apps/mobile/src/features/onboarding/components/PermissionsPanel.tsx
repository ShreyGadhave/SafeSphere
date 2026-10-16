import { Bell, BookUser, Check, MapPin, MessageSquare, Mic, Navigation, Phone, type LucideIcon } from 'lucide-react-native';
import { useCallback, useEffect, useState } from 'react';
import { AppState, StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { Card, ScalePressable, Text } from '@/components/ui';
import {
  PERMISSION_INFO,
  PERMISSION_ORDER,
  getPermissionStatuses,
  openAppSettings,
  requestPermission,
  type PermissionKind,
  type PermissionState,
} from '@/lib/permissions';
import { colors, fadeInUp, radius, spacing } from '@/theme';

const ICONS: Record<PermissionKind, LucideIcon> = {
  location: MapPin,
  backgroundLocation: Navigation,
  sms: MessageSquare,
  phone: Phone,
  microphone: Mic,
  notifications: Bell,
  contacts: BookUser,
};

export type PermissionStatuses = Record<PermissionKind, PermissionState>;

/** Live permission statuses, refreshed whenever the app comes back from Android settings. */
export function usePermissionStatuses() {
  const [statuses, setStatuses] = useState<PermissionStatuses | null>(null);
  const refresh = useCallback(async () => setStatuses(await getPermissionStatuses()), []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- sync with Android permission state (external system)
    void refresh();
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') void refresh();
    });
    return () => sub.remove();
  }, [refresh]);

  return { statuses, refresh, setStatuses };
}

export function missingEssentials(statuses: PermissionStatuses | null): PermissionKind[] {
  if (!statuses) return [];
  return PERMISSION_ORDER.filter((k) => PERMISSION_INFO[k].essential && statuses[k] !== 'granted');
}

/** One card per permission: why we need it, its state, and a button to allow / fix it. */
export function PermissionsPanel({ compact = false }: { compact?: boolean }) {
  const { statuses, setStatuses } = usePermissionStatuses();
  const [busy, setBusy] = useState<PermissionKind | null>(null);

  const act = async (kind: PermissionKind) => {
    if (!statuses) return;
    if (statuses[kind] === 'blocked') return void openAppSettings();
    setBusy(kind);
    const next = await requestPermission(kind);
    // Background location also settles foreground location.
    const updates = await getPermissionStatuses().catch(() => null);
    setStatuses(updates ?? { ...statuses, [kind]: next });
    setBusy(null);
  };

  return (
    <View style={styles.list}>
      {PERMISSION_ORDER.map((kind, i) => {
        const info = PERMISSION_INFO[kind];
        const state = statuses?.[kind];
        const Icon = ICONS[kind];
        const granted = state === 'granted';
        const needsForeground = kind === 'backgroundLocation' && statuses?.location !== 'granted';
        return (
          <Card key={kind} entering={fadeInUp(i)} style={styles.card}>
            <View style={styles.row}>
              <View style={[styles.iconWell, granted && styles.iconWellGranted]}>
                <Icon size={20} color={granted ? colors.safeText : colors.ink} strokeWidth={1.8} />
              </View>
              <View style={styles.text}>
                <Text variant="subhead">{info.title}</Text>
                {!compact || !granted ? (
                  <Text variant="footnote" color="ink3">
                    {info.reason}
                  </Text>
                ) : null}
              </View>
              {granted ? (
                <Animated.View entering={fadeInUp()} style={styles.check} accessibilityLabel={`${info.title} allowed`}>
                  <Check size={16} color={colors.safeText} strokeWidth={2.4} />
                </Animated.View>
              ) : (
                <ScalePressable
                  accessibilityRole="button"
                  accessibilityLabel={`${state === 'blocked' ? 'Open settings for' : 'Allow'} ${info.title}`}
                  disabled={!statuses || busy != null || needsForeground}
                  onPress={() => void act(kind)}
                  style={[styles.action, (needsForeground || busy === kind) && styles.actionDisabled]}>
                  <Text variant="footnote" color="white" style={styles.actionText}>
                    {busy === kind ? '…' : state === 'blocked' ? 'Settings' : 'Allow'}
                  </Text>
                </ScalePressable>
              )}
            </View>
            {state === 'blocked' ? (
              <Text variant="footnote" color="warningText">
                Turned off. Open Settings → Permissions to allow it.
              </Text>
            ) : null}
            {needsForeground ? (
              <Text variant="footnote" color="ink3">
                Allow Location first.
              </Text>
            ) : null}
          </Card>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: spacing.md },
  card: { gap: spacing.sm, paddingVertical: spacing.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  iconWell: { width: 36, height: 36, borderRadius: radius.sm, backgroundColor: colors.ground, alignItems: 'center', justifyContent: 'center' },
  iconWellGranted: { backgroundColor: colors.safeTint },
  text: { flex: 1, gap: 2 },
  check: { width: 28, height: 28, borderRadius: 14, backgroundColor: colors.safeTint, alignItems: 'center', justifyContent: 'center' },
  action: { height: 36, paddingHorizontal: spacing.md + 2, borderRadius: radius.md, backgroundColor: colors.ink, justifyContent: 'center' },
  actionDisabled: { opacity: 0.4 },
  actionText: { fontFamily: 'Figtree_700Bold', fontSize: 13 },
});
