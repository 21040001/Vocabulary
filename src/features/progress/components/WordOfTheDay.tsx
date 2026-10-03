import React, { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../../app/navigation/AppNavigator';
import { useSettings } from '../../../app/settings/SettingsContext';
import { dateKey } from '../../../services/storage/activity';
import { getStoredWord, saveWord } from '../../../services/storage/wordStorage';
import { makeStyles } from '../../../theme/makeStyles';
import { spacing } from '../../../theme/spacing';
import SpeakButton from '../../vocabulary/components/SpeakButton';
import { getWordOfTheDay } from '../../vocabulary/services/dictionaryService';
import { Word } from '../../vocabulary/types/word';
import { displayGroups, posLabel } from '../../vocabulary/utils/partOfSpeech';

/** Ana sayfadaki "Kun soʻzi" kartı. Sözlük yoksa hiç görünmez. */
export default function WordOfTheDay() {
  const s = useStyles();
  const { t } = useSettings();
  const nav = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [word, setWord] = useState<Word | null>(null);
  const [inList, setInList] = useState(false);

  useEffect(() => {
    let alive = true;
    getWordOfTheDay(dateKey(new Date()))
      .then(async w => {
        if (alive && w) {
          setWord(w);
          setInList(!!(await getStoredWord(w.id)));
        }
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, []);

  if (!word) {
    return null;
  }
  const g = displayGroups(word)[0];
  const ex = word.examples?.[0];

  return (
    <Pressable style={s.card} onPress={() => nav.navigate('WordDetail', { word })}>
      <Text style={s.label}>⭐ {t('wotd.title')}</Text>
      <View style={s.row}>
        <View style={{ flex: 1 }}>
          <Text style={s.word}>{word.word}</Text>
          {word.pronunciation && <Text style={s.ipa}>{word.pronunciation}</Text>}
        </View>
        <SpeakButton text={word.word} lang="en" />
      </View>
      <Text style={s.trans}>
        {g?.pos ? `${posLabel(g.pos, t)} · ` : ''}
        {word.translations.slice(0, 3).join(', ')}
      </Text>
      {ex && (
        <View style={s.example}>
          <Text style={s.exEn}>“{ex.en}”</Text>
          <Text style={s.exUz}>{ex.uz}</Text>
        </View>
      )}
      <Pressable
        style={[s.btn, inList && s.btnDone]}
        disabled={inList}
        onPress={async () => {
          await saveWord(word);
          setInList(true);
        }}>
        <Text style={[s.btnText, inList && s.btnTextDone]}>{inList ? t('wotd.added') : t('wotd.add')}</Text>
      </Pressable>
    </Pressable>
  );
}

const useStyles = makeStyles(c => ({
  card: {
    marginTop: spacing.md,
    padding: spacing.md,
    borderRadius: 16,
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.primary,
  },
  label: { fontSize: 12, fontWeight: '800', color: c.primary, textTransform: 'uppercase' },
  row: { flexDirection: 'row', alignItems: 'center', marginTop: 6 },
  word: { fontSize: 28, fontWeight: '800', color: c.text },
  ipa: { color: c.textSecondary },
  trans: { marginTop: 6, fontSize: 17, fontWeight: '600', color: c.success },
  example: { marginTop: spacing.sm, paddingLeft: spacing.sm, borderLeftWidth: 3, borderLeftColor: c.border },
  exEn: { color: c.text, lineHeight: 20 },
  exUz: { marginTop: 2, color: c.textSecondary, lineHeight: 20 },
  btn: { marginTop: spacing.md, paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: c.primary, alignItems: 'center' },
  btnDone: { borderColor: c.success },
  btnText: { color: c.primary, fontWeight: '700' },
  btnTextDone: { color: c.success },
}));
