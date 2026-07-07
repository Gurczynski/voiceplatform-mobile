import { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { useThemeContext } from '../src/theme/ThemeProvider';
import { useAuthStore } from '../src/stores';
import { ThemedView, ThemedText, ThemedInput, ThemedButton, ThemedHeader, Icon, icons } from '../src/components/ui';

export default function AuthScreen() {
  const { theme } = useThemeContext();
  const { colors, spacing, fontSize, borderRadius } = theme;
  const signIn = useAuthStore((s) => s.signIn);
  const signUp = useAuthStore((s) => s.signUp);

  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }
    if (mode === 'signup' && !fullName) {
      setError('Please enter your full name');
      return;
    }

    setLoading(true);
    setError('');

    const result = mode === 'signin'
      ? await signIn(email, password)
      : await signUp(email, password, fullName);

    setLoading(false);

    if (result.error) {
      setError(result.error);
    } else {
      router.replace('/(tabs)');
    }
  };

  return (
    <ThemedView variant="default" style={styles.container}>
      <ThemedHeader title={mode === 'signin' ? 'Sign In' : 'Create Account'} showBack />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <View style={[styles.logo, { backgroundColor: colors.primary }]}>
              <Icon name={icons.call} size={32} color="#FFFFFF" />
            </View>
            <ThemedText variant="subtitle" align="center">
              {mode === 'signin' ? 'Welcome back!' : 'Join VoicePlatform'}
            </ThemedText>
          </View>

          {error ? (
            <View style={[styles.errorBox, { backgroundColor: colors.error + '15', borderColor: colors.error }]}>
              <Icon name={icons.alert} size={18} color={colors.error} />
              <ThemedText style={{ color: colors.error }}>{error}</ThemedText>
            </View>
          ) : null}

          <View style={styles.form}>
            {mode === 'signup' && (
              <ThemedInput
                label="Full Name"
                placeholder="John Doe"
                value={fullName}
                onChangeText={setFullName}
                autoCapitalize="words"
                leftIcon={<Icon name={icons.person} size={18} color={colors.textMuted} />}
              />
            )}

            <ThemedInput
              label="Email"
              placeholder="you@example.com"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              leftIcon={<Icon name={icons.mail} size={18} color={colors.textMuted} />}
            />

            <ThemedInput
              label="Password"
              placeholder="••••••••"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCapitalize="none"
              leftIcon={<Icon name={icons.lock} size={18} color={colors.textMuted} />}
            />

            <ThemedButton
              title={mode === 'signin' ? 'Sign In' : 'Create Account'}
              onPress={handleSubmit}
              loading={loading}
              variant="primary"
              size="lg"
              icon={<Icon name={mode === 'signin' ? icons.logIn : icons.personAdd} size={20} color="#FFFFFF" />}
            />

            <TouchableOpacity onPress={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setError(''); }}>
              <ThemedText variant="body" align="center" style={{ color: colors.primary }}>
                {mode === 'signin'
                  ? "Don't have an account? Sign Up"
                  : 'Already have an account? Sign In'}
              </ThemedText>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  flex: { flex: 1 },
  scrollContent: { padding: 24, paddingBottom: 40 },
  header: { alignItems: 'center', marginBottom: 32, gap: 12 },
  logo: {
    width: 64,
    height: 64,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  form: { gap: 16 },
});
