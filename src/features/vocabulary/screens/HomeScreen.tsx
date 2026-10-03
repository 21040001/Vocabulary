import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Keyboard, SafeAreaView, ScrollView, Text, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../../app/navigation/AppNavigator';
import { useSettings } from '../../../app/settings/SettingsContext';
import {
  clearSearchHistory,
  getSearchHistory,
  HistoryItem,
  removeFromSearchHistory,
} from '../../../services/storage/searchHistory';
import { makeStyles } from '../../../theme/makeStyles';
import { spacing } from '../../../theme/spacing';
import DirectionToggle from '../components/DirectionToggle';
import RecentSearches from '../components/RecentSearches';
import SearchInput from '../components/SearchInput';
import SuggestionList from '../components/SuggestionList';
import TranslateButton from '../components/TranslateButton';
import TranslationResult from '../components/TranslationResult';
import useSuggestions from '../hooks/useSuggestions';
import useWord from '../hooks/useWord';
import { getTodayStatistics, TodayStatistics } from '../services/statisticsService';
import { Lang } from '../types/word';
import { displayGroups, meaningPosList } from '../utils/partOfSpeech';

export default function HomeScreen() {
  const s = useStyles();
  const { colors, t } = useSettings();
  const [q, setQ] = useState('');
  const [lang, setLang] = useState<Lang>('en');
  const [searched, setSearched] = useState('');
  const [stats, setStats] = useState<TodayStatistics | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const { word, state, loading, error, searchWord, toggleFavorite, toggleLearned } = useWord();
  const nav = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  // Arama yapıldıktan sonra aynı metin için öneri listesini gizle
  const suggestions = useSuggestions(q, lang, q !== searched);

  const load = async () => {
    setStats(await getTodayStatistics());
    setHistory(await getSearchHistory());
  };
  useFocusEffect(
    useCallback(() => {
      load();
    }, []),
  );

  const run = (text: string, l: Lang = lang) => {
    Keyboard.dismiss();
    setLang(l);
    setQ(text);
    setSearched(text);
    searchWord(text, l).then(load);
  };

  const changeLang = (l: Lang) => {
    setLang(l);
    setSearched('');
  };

  const firstDefinition = word?.meanings[0]?.definitions[0]?.definition;
  const firstExample = word?.examples?.[0];
  const showHistory = !q.trim() && !loading;

  return (
    <SafeAreaView style={s.container}>
      <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
        <Text style={s.greeting}>{t('home.greeting')}</Text>
        <Text style={s.title}>{t('home.todayProgress')}</Text>
        <View style={s.stats}>
          {[
            ['' + (stats?.reviewWords ?? 0), t('home.toReview')],
            ['' + (stats?.learnedWords ?? 0), t('home.learned')],
            [(stats?.accuracy ?? 0) + '%', t('home.accuracy')],
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
          placeholder={lang === 'en' ? t('home.searchEn') : t('home.searchUz')}
        />
        <SuggestionList items={suggestions} onSelect={x => run(x.word)} />
        {showHistory && (
          <RecentSearches
            items={history}
            onSelect={h => run(h.text, h.lang)}
            onRemove={async h => setHistory(await removeFromSearchHistory(h.text, h.lang))}
            onClear={async () => {
              await clearSearchHistory();
              setHistory([]);
            }}
          />
        )}
        <TranslateButton title={t('home.search')} onPress={() => run(q)} />

        {loading && <ActivityIndicator style={{ marginTop: 16 }} color={colors.primary} />}
        {error && <Text style={s.error}>{t('home.notFound')}</Text>}
        {word && state && (
          <TranslationResult
            word={word.word}
            lang={word.lang ?? 'en'}
            audioUrl={word.audioUrl}
            translations={word.translations}
            groups={displayGroups(word)}
            posTags={meaningPosList(word, t)}
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

const useStyles = makeStyles(c => ({
  container: { flex: 1, backgroundColor: c.background },
  content: { padding: spacing.lg },
  greeting: { color: c.textSecondary },
  title: { marginTop: 4, fontSize: 24, fontWeight: '700', color: c.text },
  stats: { flexDirection: 'row', gap: 8, marginVertical: 16 },
  stat: { flex: 1, padding: 12, borderRadius: 14, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border },
  num: { fontSize: 22, fontWeight: '700', color: c.primary },
  label: { fontSize: 12, color: c.textSecondary },
  error: { marginTop: 16, color: c.danger },
}));
