import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Keyboard, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../../app/navigation/AppNavigator';
import DirectionToggle from '../components/DirectionToggle';
import SearchInput from '../components/SearchInput';
import SuggestionList from '../components/SuggestionList';
import TranslateButton from '../components/TranslateButton';
import TranslationResult from '../components/TranslationResult';
import useSuggestions from '../hooks/useSuggestions';
import useWord from '../hooks/useWord';
import { getTodayStatistics, TodayStatistics } from '../services/statisticsService';
import { Lang } from '../types/word';
import { colors } from '../../../theme/colors';
import { spacing } from '../../../theme/spacing';

export default function HomeScreen() {
  const [q, setQ] = useState('');
  const [lang, setLang] = useState<Lang>('en');
  const [searched, setSearched] = useState('');
  const [stats, setStats] = useState<TodayStatistics | null>(null);
  const { word, state, loading, error, searchWord, toggleFavorite, toggleLearned } = useWord();
  const nav = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  // Arama yapıldıktan sonra aynı metin için öneri listesini gizle
  const suggestions = useSuggestions(q, lang, q !== searched);

  const load = async () => setStats(await getTodayStatistics());
  useFocusEffect(
    useCallback(() => {
      load();
    }, []),
  );

  const run = (text: string) => {
    Keyboard.dismiss();
    setQ(text);
    setSearched(text);
    searchWord(text, lang).then(load);
  };

  const changeLang = (l: Lang) => {
    setLang(l);
    setSearched('');
  };

  const firstDefinition = word?.meanings[0]?.definitions[0]?.definition;
  const firstExample = word?.examples?.[0];

  return (
    <SafeAreaView style={s.container}>
      <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
        <Text style={s.greeting}>Keep learning 👋</Text>
        <Text style={s.title}>Today's Progress</Text>
        <View style={s.stats}>
          {[
            ['' + (stats?.reviewWords ?? 0), 'To Review'],
            ['' + (stats?.learnedWords ?? 0), 'Learned'],
            [(stats?.accuracy ?? 0) + '%', 'Accuracy'],
          ].map(([v, l]) => (
            <View style={s.stat} key={l}>
              <Text style={s.num}>{v}</Text>
              <Text style={s.label}>{l}</Text>
            </View>
          ))}
        </View>

        <DirectionToggle value={lang} onChange={changeLang} />
        <SearchInput
          value={q}
          onChangeText={setQ}
          onSubmit={() => run(q)}
          placeholder={lang === 'en' ? 'Search an English word...' : 'Oʻzbekcha soʻz kiriting...'}
        />
        <SuggestionList items={suggestions} onSelect={x => run(x.word)} />
        <TranslateButton title="Search" onPress={() => run(q)} />

        {loading && <ActivityIndicator style={{ marginTop: 16 }} />}
        {error && <Text style={s.error}>{error}</Text>}
        {word && state && (
          <TranslationResult
            word={word.word}
            translations={word.translations}
            pronunciation={word.pronunciation}
            definition={firstDefinition}
            example={firstExample ? (word.lang === 'uz' ? firstExample.uz : firstExample.en) : undefined}
            exampleTranslation={firstExample ? (word.lang === 'uz' ? firstExample.en : firstExample.uz) : undefined}
            isMachineTranslation={word.source === 'api'}
            isFavorite={state.isFavorite}
            onToggleFavorite={toggleFavorite}
            isLearned={state.isLearned}
            onToggleLearned={toggleLearned}
            onOpenDetails={() => nav.navigate('WordDetail', { word })}
          />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg },
  greeting: { color: colors.textSecondary },
  title: { marginTop: 4, fontSize: 24, fontWeight: '700', color: colors.text },
  stats: { flexDirection: 'row', gap: 8, marginVertical: 16 },
  stat: {
    flex: 1,
    padding: 12,
    borderRadius: 14,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  num: { fontSize: 22, fontWeight: '700', color: colors.primary },
  label: { fontSize: 12, color: colors.textSecondary },
  error: { marginTop: 16, color: '#DC2626' },
});
