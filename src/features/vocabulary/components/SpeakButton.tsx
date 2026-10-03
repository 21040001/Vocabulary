import React, { useState } from 'react';
import { Alert, Platform, Pressable, StyleSheet, Text } from 'react-native';
import { colors } from '../../../theme/colors';
import { openVoiceInstaller, pronounce } from '../../../services/speech/speech';
import { Lang } from '../types/word';

type Props = { text: string; lang: Lang; audioUrl?: string; size?: number };

export default function SpeakButton({ text, lang, audioUrl, size = 40 }: Props) {
  const [busy, setBusy] = useState(false);

  const onPress = async () => {
    if (busy) {
      return;
    }
    setBusy(true);
    try {
      const r = await pronounce(text, lang, audioUrl);
      if (r === 'no-voice') {
        Alert.alert(
          'Voice not installed',
          'Your phone has no Uzbek voice. You can install one in the text-to-speech settings.',
          Platform.OS === 'android'
            ? [{ text: 'Cancel', style: 'cancel' }, { text: 'Open settings', onPress: openVoiceInstaller }]
            : [{ text: 'OK' }],
        );
      }
    } catch (e) {
      console.warn('[speech]', e);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Pressable
      onPress={onPress}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={`Pronounce ${text}`}
      style={[s.btn, { width: size, height: size, borderRadius: size / 2 }, busy && s.busy]}>
      <Text style={{ fontSize: size * 0.45 }}>{busy ? '🔊' : '🔈'}</Text>
    </Pressable>
  );
}

const s = StyleSheet.create({
  btn: { alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border },
  busy: { borderColor: colors.primary },
});