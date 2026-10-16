import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { Button, Card, FormScreen, ScalePressable, Text, TextField } from '@/components/ui';
import { normalizePhone } from '@/features/contacts/phone';
import { fadeInUp, spacing } from '@/theme';

import { AuthHeader } from '../components/AuthHeader';
import { MIN_PASSWORD_LENGTH, isValidEmail, signUp } from '../services/authService';

type Errors = Partial<Record<'fullName' | 'phone' | 'email' | 'password', string>>;

export function SignUpScreen() {
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [confirmSentTo, setConfirmSentTo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    const normalized = normalizePhone(phone);
    const found: Errors = {
      fullName: fullName.trim() ? undefined : 'Add your name.',
      phone: normalized ? undefined : 'Enter a valid mobile number.',
      email: isValidEmail(email) ? undefined : 'Enter a valid email.',
      password: password.length >= MIN_PASSWORD_LENGTH ? undefined : `At least ${MIN_PASSWORD_LENGTH} characters.`,
    };
    setErrors(found);
    if (Object.values(found).some(Boolean) || !normalized) return;
    setFormError(null);
    setBusy(true);
    try {
      const { signedIn } = await signUp({ fullName, email, password, phone: normalized });
      // With email confirmation on, there is no session yet — tell the user to check their inbox.
      if (!signedIn) setConfirmSentTo(email.trim());
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'Could not create your account.');
    } finally {
      setBusy(false);
    }
  };

  if (confirmSentTo) {
    return (
      <FormScreen footer={<Button label="Back to sign in" size="large" onPress={() => router.replace('/sign-in')} />}>
        <AuthHeader title="Check your email" subtitle={`We sent a confirmation link to ${confirmSentTo}.`} />
        <Card entering={fadeInUp(1)}>
          <Text variant="caption" color="ink2">
            Open the link, then come back and sign in. If it doesn’t arrive in a few minutes, check your spam folder.
          </Text>
        </Card>
      </FormScreen>
    );
  }

  return (
    <FormScreen
      footer={
        <>
          {formError ? (
            <Text variant="footnote" color="dangerText" align="center">
              {formError}
            </Text>
          ) : null}
          <Button label="Create account" size="large" loading={busy} onPress={submit} />
          <View style={styles.switchRow}>
            <Text variant="caption" color="ink2">
              Already have an account?
            </Text>
            <ScalePressable accessibilityRole="link" onPress={() => router.replace('/sign-in')} hitSlop={8}>
              <Text variant="caption" color="info" style={styles.link}>
                Sign in
              </Text>
            </ScalePressable>
          </View>
        </>
      }>
      <AuthHeader title="Create your account" subtitle="It takes about two minutes to set up your safety net." />
      <Animated.View entering={fadeInUp(1)} style={styles.fields}>
        <TextField
          label="Full name"
          value={fullName}
          onChangeText={setFullName}
          autoCapitalize="words"
          autoComplete="name"
          textContentType="name"
          error={errors.fullName}
        />
        <TextField
          label="Mobile number"
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
          autoComplete="tel"
          textContentType="telephoneNumber"
          placeholder="98765 43210"
          error={errors.phone}
        />
        <TextField
          label="Email"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          textContentType="emailAddress"
          error={errors.email}
        />
        <TextField
          label="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoComplete="new-password"
          textContentType="newPassword"
          error={errors.password}
          hint={`At least ${MIN_PASSWORD_LENGTH} characters.`}
        />
      </Animated.View>
    </FormScreen>
  );
}

const styles = StyleSheet.create({
  fields: { gap: spacing.lg },
  link: { fontFamily: 'Figtree_700Bold' },
  switchRow: { flexDirection: 'row', justifyContent: 'center', gap: spacing.xs, paddingVertical: spacing.xs },
});
