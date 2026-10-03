import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRoute } from '@react-navigation/native';
import SpeakButton from '../components/SpeakButton';
import { Lang, Word, wordLang } from '../types/word';
import { displayGroups, posLabel } from '../utils/partOfSpeech';
import { colors } from '../../../theme/colors';
import { spacing } from '../../../theme/spacing';

export default function WordDetailScreen() {
  const route = useRoute();
  const { word } = route.params as { word: Word };
  const lang = wordLang(word);
  const other: Lang = lang === 'en' ? 'uz' : 'en';

  return (
    <ScrollView style={s.c} contentContainerStyle={s.p}>
      <View style={s.head}>
        <View style={s.row}>
          <Text style={s.word}>{word.word}</Text>
          <SpeakButton text={word.word} lang={lang} audioUrl={word.audioUrl} size={48} />
        </View>
        {word.pronunciation && <Text style={s.sub}>{word.pronunciation}</Text>}
      </View>

      <View style={s.sec}>
        <Text style={s.st}>Translations</Text>
        {displayGroups(word).map((g, gi) => (
          <View key={gi} style={gi > 0 ? { marginTop: 12 } : undefined}>
            {g.pos && <Text style={s.pos}>{posLabel(g.pos)}</Text>}
            {g.translations.map((x, i) => (
              <View key={i} style={s.transRow}>
                <Text style={s.trans}>• {x}</Text>
                <SpeakButton text={x} lang={other} size={30} />
              </View>
            ))}
          </View>
        ))}
        {word.source === 'api' && <Text style={s.note}>Machine translation</Text>}
      </View>

      {!!word.examples?.length && (
        <View style={s.sec}>
          <Text style={s.st}>Examples</Text>
          {word.examples.map((e, i) => {
            const main = lang === 'uz' ? e.uz : e.en;
            return (
              <View style={s.def} key={i}>
                <View style={s.transRow}>
                  <Text style={[s.dt, { flex: 1 }]}>{main}</Text>
                  <SpeakButton text={main} lang={lang} size={30} />
                </View>
                <Text style={s.ex}>{lang === 'uz' ? e.en : e.uz}</Text>
              </View>
            );
          })}
        </View>
      )}

      {word.meanings.map((m, mi) => (
        <View style={s.sec} key={mi}>
          <Text style={s.pos}>{m.partOfSpeech}</Text>
          {m.definitions.map((d, di) => (
            <View style={s.def} key={di}>
              <Text style={s.dt}>
                {di + 1}. {d.definition}
              </Text>
              {d.example && <Text style={s.ex}>"{d.example}"</Text>}
              {d.synonyms.length > 0 && <Text style={s.list}>Synonyms: {d.synonyms.join(', ')}</Text>}
              {d.antonyms.length > 0 && <Text style={s.list}>Antonyms: {d.antonyms.join(', ')}</Text>}
            </View>
          ))}
        </View>
      ))}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  c: { flex: 1, backgroundColor: colors.background },
  p: { padding: spacing.lg },
  head: { paddingBottom: 24, borderBottomWidth: 1, borderBottomColor: colors.border },
  row: { flexDirection: 'row', alignItems: 'center' },
  word: { flex: 1, fontSize: 36, fontWeight: '700', color: colors.text },
  sub: { marginTop: 8, fontSize: 16, color: colors.textSecondary },
  sec: { marginTop: 24, padding: 24, borderRadius: 16, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  st: { fontSize: 20, fontWeight: '700', color: colors.text },
  transRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4, gap: 8 },
  trans: { flex: 1, fontSize: 18, color: colors.text },
  pos: { fontSize: 18, fontWeight: '700', color: colors.primary, textTransform: 'uppercase' },
  def: { marginTop: 16 },
  dt: { fontSize: 16, lineHeight: 24, color: colors.text },
  ex: { marginTop: 8, fontStyle: 'italic', color: colors.textSecondary },
  list: { marginTop: 12, fontSize: 14, color: colors.textSecondary },
  note: { marginTop: 8, fontSize: 12, fontStyle: 'italic', color: colors.textSecondary },
});