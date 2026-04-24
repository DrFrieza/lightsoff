import { useState } from 'react';
import {
  KeyboardAvoidingView, Platform,
  SafeAreaView,
  StyleSheet,
  Text, TextInput, TouchableOpacity,
  View
} from 'react-native';
import { Path, Svg } from 'react-native-svg';
import { supabase } from '../lib/supabase';
import tokens from '../lib/tokens';

const t = tokens.semantic.dark;
const { spacing, radius, fontSize, fontWeight, component } = tokens;

const Logo = () => (
  <Svg width={64} height={64} viewBox="0 0 80 80" fill="none">
    <Path
      d="M28.6044 17.8902C28.6044 21.0125 27.5822 23.8961 25.8543 26.2246C23.8763 28.8902 20.7501 29.6402 17.2501 29.3902C9.53771 28.8393 1.60941 20.1402 1.10941 16.6402C0.8928 15.1401 0.965586 14.2614 1.62186 12.6401C3.69873 7.50939 8.72883 3.89008 14.6043 3.89008C22.3363 3.89008 28.6044 10.1581 28.6044 17.8902Z"
      fill="white"
    />
    <Path
      d="M79.0002 38.2694C79.0002 41.1417 78.0559 43.7945 76.4598 45.9366C74.6325 48.3888 71.7446 49.0787 68.5114 48.8487C61.3869 48.342 54.063 40.3393 53.6011 37.1195C53.401 35.7396 53.4682 34.9312 54.0745 33.4397C55.993 28.7197 60.6397 25.3902 66.0673 25.3902C73.2099 25.3902 79.0002 31.1564 79.0002 38.2694Z"
      fill="white"
    />
    <Path
      d="M51.2456 68.031L53.2456 47.5309C50.845 46.5309 46.5791 51.1142 44.7463 53.5309C42.3296 56.3643 36.5962 60.5809 32.9962 54.7809C29.3962 48.9809 23.1628 49.8642 20.4961 51.0309C18.8294 51.7809 15.4961 54.6309 15.4961 60.0309C15.4961 65.431 20.829 67.281 23.4954 67.531C22.9121 66.4477 22.3454 64.181 24.7454 63.781C27.1454 63.381 29.9121 66.9477 30.9955 68.781C32.3288 71.1143 36.4955 75.781 42.4955 75.781C48.4956 75.781 50.8289 70.6143 51.2456 68.031Z"
      fill="white"
    />
  </Svg>
);

export default function AuthScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleAuth = async () => {
    setLoading(true);
    setError('');
    setSuccess('');

    if (isLogin) {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setError(error.message);
    } else {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) setError(error.message);
      else setSuccess('Check your email to confirm your account.');
    }
    setLoading(false);
  };

  return (
    <SafeAreaView style={s.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={s.inner}
      >
        <View style={s.logoArea}>
          <Logo />
          <Text style={s.appName}>LightsOff</Text>
          <Text style={s.tagline}>Track bedtime. Find the pattern.</Text>
        </View>

        <View style={s.form}>
          <View style={s.fieldGroup}>
            <View style={s.fieldRow}>
              <TextInput
                style={s.input}
                placeholder="Email"
                placeholderTextColor={t.textMuted}
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
              />
            </View>
            <View style={[s.fieldRow, { borderBottomWidth: 0 }]}>
              <TextInput
                style={s.input}
                placeholder="Password"
                placeholderTextColor={t.textMuted}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />
            </View>
          </View>

          {error ? <Text style={s.error}>{error}</Text> : null}
          {success ? <Text style={s.successMsg}>{success}</Text> : null}

          <TouchableOpacity
            style={[s.primaryBtn, loading && { opacity: 0.6 }]}
            onPress={handleAuth}
            disabled={loading}
            activeOpacity={0.85}
          >
            <Text style={s.primaryBtnText}>
              {loading ? 'Please wait...' : isLogin ? 'Sign in' : 'Create account'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => { setIsLogin(!isLogin); setError(''); setSuccess(''); }}
            style={s.toggleBtn}
          >
            <Text style={s.toggleText}>
              {isLogin ? "Don't have an account? " : 'Already have an account? '}
              <Text style={s.toggleTextBold}>
                {isLogin ? 'Sign up' : 'Sign in'}
              </Text>
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: t.bg },
  inner: { flex: 1, justifyContent: 'center', padding: spacing[6] },

  logoArea: { alignItems: 'center', marginBottom: spacing[12] },
  appName: {
    fontSize: fontSize['5xl'],
    fontWeight: String(fontWeight.bold) as any,
    color: t.textPrimary,
    marginTop: spacing[5],
    letterSpacing: -1,
  },
  tagline: {
    fontSize: fontSize.base,
    color: t.textSecondary,
    marginTop: spacing[2],
  },

  form: { gap: spacing[3] },
  fieldGroup: {
    backgroundColor: t.bgShell,
    borderRadius: radius.lg,
    borderWidth: 1, borderColor: t.border,
    overflow: 'hidden',
  },
  fieldRow: {
    borderBottomWidth: 0.5, borderBottomColor: t.divider,
    paddingHorizontal: spacing[5], paddingVertical: spacing[1],
  },
  input: {
    fontSize: fontSize.md,
    color: t.textPrimary,
    paddingVertical: spacing[4],
  },

  error: {
    color: tokens.color.error[400],
    fontSize: fontSize.sm,
    textAlign: 'center',
    paddingHorizontal: spacing[2],
  },
  successMsg: {
    color: tokens.color.success[500],
    fontSize: fontSize.sm,
    textAlign: 'center',
    paddingHorizontal: spacing[2],
  },

  primaryBtn: {
    backgroundColor: t.textPrimary,
    borderRadius: radius.md,
    height: component.button.heightLg,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing[2],
  },
  primaryBtnText: {
    color: tokens.color.black,
    fontSize: fontSize.md,
    fontWeight: String(fontWeight.bold) as any,
  },

  toggleBtn: { alignItems: 'center', paddingVertical: spacing[3] },
  toggleText: { fontSize: fontSize.sm, color: t.textSecondary },
  toggleTextBold: {
    color: t.textPrimary,
    fontWeight: String(fontWeight.semibold) as any,
  },
});