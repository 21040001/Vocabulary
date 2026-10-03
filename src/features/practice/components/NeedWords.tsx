import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../../app/navigation/AppNavigator';
import { useT } from '../../../app/settings/SettingsContext';
import { makeStyles } from '../../../theme/makeStyles';
import { spacing } from '../../../theme/spacing';

/** Alıştırma için yeterli kelime yoksa: Darajalar'a yönlendir */
export default function NeedWords() {
  const s = useStyles();
  const t = useT();
  const nav = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  return (
    <View style={s.c}>
      <Text style={s.text}>{t('practice.needWords')}</Text>
      <Pressable style={s.btn} onPress={() => nav.navigate('Levels')}>
        <Text style={s.btnText}>{t('practice.goLevels')}</Text>
      </Pressable>
    </View>
  );
}

const useStyles = makeStyles(c => ({
  c: { flex: 1, backgroundColor: c.background, padding: spacing.lg, justifyContent: 'center', alignItems: 'center' },
  text: { fontSize: 17, color: c.textSecondary, textAlign: 'center', lineHeight: 24 },
  btn: { marginTop: spacing.lg, paddingVertical: 14, paddingHorizontal: 24, borderRadius: 12, backgroundColor: c.primary },
  btnText: { color: c.white, fontWeight: '700', fontSize: 16 },
}));
