import { Plus, Star } from 'lucide-react-native';
import { useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { Avatar, Button, Card, ScalePressable, Text } from '@/components/ui';
import { colors, fadeInUp, spacing } from '@/theme';

import { useContacts, useDeleteContact, type EmergencyContact } from '../hooks/useContacts';
import { formatPhone } from '../phone';
import { MAX_CONTACTS, canAddContact } from '../rules';

import { ContactEditor } from './ContactEditor';

/** Emergency contacts with add / edit / delete. Tap a contact to edit, long-press to remove. */
export function ContactList() {
  const { data: contacts = [], isLoading, error, refetch } = useContacts();
  const remove = useDeleteContact();
  const [editing, setEditing] = useState<EmergencyContact | null>(null);
  const [adding, setAdding] = useState(false);

  const confirmDelete = (contact: EmergencyContact) => {
    if (contacts.length <= 1) {
      Alert.alert('Keep at least one contact', 'SOS needs someone to alert. Add another contact before removing this one.');
      return;
    }
    Alert.alert(`Remove ${contact.name}?`, 'They will no longer get your SOS alerts.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => remove.mutate(contact.id) },
    ]);
  };

  if (isLoading) return <ActivityIndicator color={colors.ink} style={styles.loading} />;
  if (error) {
    return (
      <Card style={styles.errorCard}>
        <Text variant="subhead">Couldn’t load your contacts.</Text>
        <Button label="Try again" variant="secondary" onPress={() => void refetch()} />
      </Card>
    );
  }

  return (
    <View style={styles.wrap}>
      {contacts.length > 0 ? (
        <Card flush entering={fadeInUp()}>
          {contacts.map((c, i) => (
            <Animated.View key={c.id}>
              <ScalePressable
                accessibilityRole="button"
                accessibilityLabel={`${c.name}, ${c.is_primary ? 'primary contact, ' : ''}${formatPhone(c.phone)}`}
                accessibilityHint="Tap to edit, long-press to remove"
                onPress={() => setEditing(c)}
                onLongPress={() => confirmDelete(c)}
                style={[styles.row, i < contacts.length - 1 && styles.divider]}>
                <Avatar name={c.name} size={40} index={i} ringColor={colors.card} />
                <View style={styles.text}>
                  <Text variant="subhead">{c.name}</Text>
                  <Text variant="footnote" color="ink3">
                    {[formatPhone(c.phone), c.relation].filter(Boolean).join(' · ')}
                  </Text>
                </View>
                {c.is_primary ? (
                  <View style={styles.badge}>
                    <Star size={12} color={colors.safeText} fill={colors.safeText} />
                    <Text variant="footnote" color="safeText" style={styles.badgeText}>
                      Primary
                    </Text>
                  </View>
                ) : null}
              </ScalePressable>
            </Animated.View>
          ))}
        </Card>
      ) : null}

      {canAddContact(contacts.length) ? (
        <Button label={contacts.length ? 'Add another contact' : 'Add a contact'} variant="secondary" icon={Plus} onPress={() => setAdding(true)} />
      ) : (
        <Text variant="footnote" color="ink3" align="center">
          {`You’ve added the maximum of ${MAX_CONTACTS} contacts.`}
        </Text>
      )}

      <ContactEditor visible={adding} onClose={() => setAdding(false)} />
      <ContactEditor visible={editing != null} contact={editing} onClose={() => setEditing(null)} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.md },
  loading: { marginVertical: spacing.xxl },
  errorCard: { gap: spacing.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.md, minHeight: 64 },
  divider: { borderBottomWidth: 1, borderBottomColor: colors.divider },
  text: { flex: 1, gap: 1 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.safeTint, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  badgeText: { fontFamily: 'Figtree_700Bold' },
});
