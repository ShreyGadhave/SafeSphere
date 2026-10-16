import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { StyleSheet, View, type TextInput } from 'react-native';
import Animated from 'react-native-reanimated';

import { Button, Card, FormScreen, ScalePressable, Text, TextField } from '@/components/ui';
import { fadeInUp, spacing } from '@/theme';

import { AuthHeader } from '../components/AuthHeader';
import { isValidEmail, requestPasswordReset, signIn } from '../services/authService';

export function SignInScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState<'signIn' | 'reset' | null>(null);
  const passwordRef = useRef<TextInput>(null);

  const submit = async () => {
    setNotice(null);
    if (!isValidEmail(email)) return setError('Enter the email you signed up with.');
    if (!password) return setError('Enter your password.');
    setError(null);
    setBusy('signIn');
    try {
      await signIn(email, password);
      // The root auth gate moves to onboarding or the app automatically.
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not sign in.');
    } finally {
      setBusy(null);
    }
  };

  const reset = async () => {
    setError(null);
    if (!isValidEmail(email)) return setError('Type your email above first, then tap “Forgot password”.');
    setBusy('reset');
    try {
      await requestPasswordReset(email);
      setNotice(`We sent a reset link to ${email.trim()}. Open it on this phone, then sign in with your new password.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not send the reset email.');
    } finally {
      setBusy(null);
    }
  };

  return (
    <FormScreen
      footer={
        <>
          <Button label="Sign in" size="large" loading={busy === 'signIn'} onPress={submit} />
          <View style={styles.switchRow}>
            <Text variant="caption" color="ink2">
              New to SafeSphere?
            </Text>
            <ScalePressable accessibilityRole="link" onPress={() => router.replace('/sign-up')} hitSlop={8}>
              <Text variant="caption" color="info" style={styles.link}>
                Create an account
              </Text>
            </ScalePressable>
          </View>
        </>
      }>
      <AuthHeader title="Welcome back" subtitle="Sign in to keep your contacts and safety settings with you." />
      <Animated.View entering={fadeInUp(1)} style={styles.fields}>
        <TextField
          label="Email"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          textContentType="emailAddress"
          returnKeyType="next"
          onSubmitEditing={() => passwordRef.current?.focus()}
        />
        <TextField
          ref={passwordRef}
          label="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoComplete="current-password"
          textContentType="password"
          returnKeyType="go"
          onSubmitEditing={submit}
        />
        <ScalePressable accessibilityRole="button" onPress={reset} disabled={busy != null} hitSlop={8} style={styles.forgot}>
          <Text variant="caption" color="info" style={styles.link}>
            {busy === 'reset' ? 'Sending…' : 'Forgot password?'}
          </Text>
        </ScalePressable>
        {error ? (
          <Text variant="footnote" color="dangerText" accessibilityLiveRegion="polite">
            {error}
          </Text>
        ) : null}
        {notice ? (
          <Card style={styles.notice}>
            <Text variant="caption" color="ink2">
              {notice}
            </Text>
          </Card>
        ) : null}
      </Animated.View>
    </FormScreen>
  );
}

const styles = StyleSheet.create({
  fields: { gap: spacing.lg },
  forgot: { alignSelf: 'flex-end' },
  link: { fontFamily: 'Figtree_700Bold' },
  switchRow: { flexDirection: 'row', justifyContent: 'center', gap: spacing.xs, paddingVertical: spacing.xs },
  notice: { padding: spacing.md },
});
