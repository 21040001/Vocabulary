import React, { useState } from 'react';
import { Alert, Platform, Pressable, Text } from 'react-native';
import { useT } from '../../../app/settings/SettingsContext';
import { makeStyles } from '../../../theme/makeStyles';
import { openVoiceInstaller, pronounce } from '../../../services/speech/speech';
import { Lang } from '../types/word';

type Props = { text: string; lang: Lang; audioUrl?: string; size?: number };

/** 🔈 düğmesi: kelimeyi seslendirir */
export default function SpeakButton({ text, lang, audioUrl, size = 40 }: Props) {
  const s = useStyles();
  const t = useT();
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
          t('speak.noVoiceTitle'),
          t('speak.noVoiceMsg'),
          Platform.OS === 'android'
            ? [
                { text: t('common.cancel'), style: 'cancel' },
                { text: t('speak.openSettings'), onPress: openVoiceInstaller },
              ]
            : [{ text: t('common.ok') }],
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
      accessibilityLabel={text}
      style={[s.btn, { width: size, height: size, borderRadius: size / 2 }, busy && s.busy]}>
      <Text style={{ fontSize: size * 0.45 }}>{busy ? '🔊' : '🔈'}</Text>
    </Pressable>
  );
}

const useStyles = makeStyles(c => ({
  btn: { alignItems: 'center', justifyContent: 'center', backgroundColor: c.background, borderWidth: 1, borderColor: c.border },
  busy: { borderColor: c.primary },
}));
