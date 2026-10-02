import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Sound from 'react-native-sound';
import { useRoute } from '@react-navigation/native';
import { Word } from '../types/word';
import { displayGroups, posLabel } from '../utils/partOfSpeech';
import { colors } from '../../../theme/colors';
import { spacing } from '../../../theme/spacing';

export default function WordDetailScreen() {
  const route = useRoute();
  const { word } = route.params as { word: Word };
  const [playing, setPlaying] = useState(false);

  const play = () => {
    if (!word.audioUrl || playing) return;

    setPlaying(true);
    const sound = new Sound(word.audioUrl, '', (e) => {
      if (e) {
        setPlaying(false);
        return;
      }
      sound.play(() => {
        sound.release();
        setPlaying(false);
      });
    });
  };

  return (
    <ScrollView style={s.c} contentContainerStyle={s.p}>
      <View style={s.head}>
        <View style={s.row}>
          <Text style={s.word}>{word.word}</Text>
          {word.audioUrl && (
            <Pressable style={s.audio} onPress={play}>
              <Text>{playing ? '🔊' : '🔈'}</Text>
            </Pressable>
          )}
        </View>
        {word.pronunciation && <Text style={s.sub}>{word.pronunciation}</Text>}
      </View>

      <View style={s.sec}>
        <Text style={s.st}>Translations</Text>
        {displayGroups(word).map((g, gi) => (
          <View key={gi} style={gi > 0 ? { marginTop: 12 } : undefined}>
            {g.pos && <Text style={s.pos}>{posLabel(g.pos)}</Text>}
            {g.translations.map((x, i) => (
              <Text key={i} style={s.trans}>
                • {x}
              </Text>
            ))}
          </View>
        ))}
        {word.source === 'api' && (
          <Text style={s.note}>Machine translation</Text>
        )}
      </View>

      {!!word.examples?.length && (
        <View style={s.sec}>
          <Text style={s.st}>Examples</Text>
          {word.examples.map((e, i) => (
            <View style={s.def} key={i}>
              <Text style={s.dt}>{word.lang === 'uz' ? e.uz : e.en}</Text>
              <Text style={s.ex}>{word.lang === 'uz' ? e.en : e.uz}</Text>
            </View>
          ))}
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
              {d.synonyms.length > 0 && (
                <Text style={s.list}>
                  Synonyms: {d.synonyms.join(', ')}
                </Text>
              )}
              {d.antonyms.length > 0 && (
                <Text style={s.list}>
                  Antonyms: {d.antonyms.join(', ')}
                </Text>
              )}
            </View>
          ))}
        </View>
      ))}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  c: {
    flex: 1,
    backgroundColor: colors.background,
  },
  p: {
    padding: spacing.lg,
  },
  head: {
    paddingBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  word: {
    flex: 1,
    fontSize: 36,
    fontWeight: '700',
    color: colors.text,
  },
  audio: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sub: {
    marginTop: 8,
    color: colors.textSecondary,
  },
  sec: {
    marginTop: 24,
    padding: 24,
    borderRadius: 16,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  st: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },
  trans: {
    marginTop: 4,
    fontSize: 18,
    color: colors.text,
  },
  pos: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.primary,
    textTransform: 'uppercase',
  },
  def: {
    marginTop: 16,
  },
  dt: {
    fontSize: 16,
    lineHeight: 24,
    color: colors.text,
  },
  ex: {
    marginTop: 8,
    fontStyle: 'italic',
    color: colors.textSecondary,
  },
  list: {
    marginTop: 12,
    fontSize: 14,
    color: colors.textSecondary,
  },
  note: {
    marginTop: 8,
    fontSize: 12,
    fontStyle: 'italic',
    color: colors.textSecondary,
  },
});