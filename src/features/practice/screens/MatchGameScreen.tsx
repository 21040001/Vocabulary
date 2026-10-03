import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSettings } from '../../../app/settings/SettingsContext';
import { makeStyles } from '../../../theme/makeStyles';
import { spacing } from '../../../theme/spacing';
import { recordActivity } from '../../../core/progress/activity';
import NeedWords from '../components/NeedWords';
import { getSessionWords } from '../services/practiceData';
import { buildMatchPairs, MatchPair, shuffle } from '../utils/questions';

const PAIRS = 5;
const MIN_PAIRS = 3;

/** Eşleştirme oyunu: soldan kelime, sağdan çevirisi seçilir */
export default function MatchGameScreen() {
  const s = useStyles();
  const { colors, t } = useSettings();
  const [pairs, setPairs] = useState<MatchPair[] | null>(null);
  const [rights, setRights] = useState<MatchPair[]>([]);
  const [selected, setSelected] = useState<string | null>(null); // seçili sol kelimenin id'si
  const [matched, setMatched] = useState<Set<string>>(new Set());
  const [wrong, setWrong] = useState<{ left: string; right: string } | null>(null);
  const [mistakes, setMistakes] = useState(0);
  const [startedAt, setStartedAt] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const wrongTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async () => {
    setPairs(null);
    const { session } = await getSessionWords(40);
    const ps = buildMatchPairs(session, PAIRS);
    setPairs(ps);
    setRights(shuffle(ps));
    setSelected(null);
    setMatched(new Set());
    setWrong(null);
    setMistakes(0);
    setStartedAt(Date.now());
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  useEffect(
    () => () => {
      if (wrongTimer.current) {
        clearTimeout(wrongTimer.current);
      }
    },
    [],
  );

  const done = !!pairs && pairs.length >= MIN_PAIRS && matched.size === pairs.length;

  useEffect(() => {
    if (done) {
      setSeconds(Math.round((Date.now() - startedAt) / 1000));
    }
  }, [done, startedAt]);

  if (!pairs) {
    return (
      <View style={s.center}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }
  if (pairs.length < MIN_PAIRS) {
    return <NeedWords />;
  }

  const pickRight = (p: MatchPair) => {
    if (!selected || matched.has(p.id)) {
      return;
    }
    if (p.id === selected) {
      setMatched(m => new Set(m).add(p.id));
      recordActivity(true).catch(() => undefined);
      setSelected(null);
    } else {
      setMistakes(x => x + 1);
      setWrong({ left: selected, right: p.id });
      if (wrongTimer.current) {
        clearTimeout(wrongTimer.current);
      }
      wrongTimer.current = setTimeout(() => {
        setWrong(null);
        setSelected(null);
      }, 600);
    }
  };

  const tile = (id: string, label: string, side: 'left' | 'right', onPress: () => void) => {
    const isMatched = matched.has(id);
    const isSelected = side === 'left' && selected === id;
    const isWrong = wrong && (side === 'left' ? wrong.left === id : wrong.right === id);
    return (
      <Pressable
        key={`${side}-${id}`}
        onPress={onPress}
        disabled={isMatched || !!wrong}
        style={[s.tile, isSelected && s.selected, isWrong && s.wrong, isMatched && s.matched]}>
        <Text style={[s.tileText, (isWrong || isMatched) && s.tileTextOn]} numberOfLines={2}>
          {label}
        </Text>
      </Pressable>
    );
  };

  return (
    <ScrollView style={s.c} contentContainerStyle={s.p}>
      {done ? (
        <View style={s.done}>
          <Text style={s.doneTitle}>{t('practice.matchDone')}</Text>
          <Text style={s.stat}>{t('practice.time', { n: seconds })}</Text>
          <Text style={s.stat}>{t('practice.mistakes', { n: mistakes })}</Text>
          <Pressable style={s.primary} onPress={load}>
            <Text style={s.primaryText}>{t('practice.newRound')}</Text>
          </Pressable>
        </View>
      ) : (
        <>
          <Text style={s.prompt}>{t('practice.matchPrompt')}</Text>
          <Text style={s.mistakes}>{t('practice.mistakes', { n: mistakes })}</Text>
          <View style={s.columns}>
            <View style={s.col}>
              {pairs.map(p => tile(p.id, p.left, 'left', () => !matched.has(p.id) && setSelected(p.id)))}
            </View>
            <View style={s.col}>{rights.map(p => tile(p.id, p.right, 'right', () => pickRight(p)))}</View>
          </View>
        </>
      )}
    </ScrollView>
  );
}

const useStyles = makeStyles(c => ({
  c: { flex: 1, backgroundColor: c.background },
  p: { padding: spacing.lg, paddingBottom: 40 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: c.background },
  prompt: { color: c.textSecondary, textAlign: 'center' },
  mistakes: { marginTop: 4, color: c.textSecondary, textAlign: 'center', fontWeight: '600' },
  columns: { flexDirection: 'row', gap: 10, marginTop: spacing.md },
  col: { flex: 1, gap: 10 },
  tile: {
    minHeight: 64,
    paddingHorizontal: 10,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: c.border,
    backgroundColor: c.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selected: { borderColor: c.primary, borderWidth: 2.5 },
  wrong: { backgroundColor: c.danger, borderColor: c.danger },
  matched: { backgroundColor: c.success, borderColor: c.success, opacity: 0.6 },
  tileText: { fontSize: 16, fontWeight: '600', color: c.text, textAlign: 'center' },
  tileTextOn: { color: c.white },
  done: { alignItems: 'center', marginTop: spacing.xl },
  doneTitle: { fontSize: 26, fontWeight: '700', color: c.text, textAlign: 'center' },
  stat: { marginTop: spacing.sm, fontSize: 18, color: c.textSecondary },
  primary: {
    alignSelf: 'stretch',
    marginTop: spacing.lg,
    padding: 16,
    borderRadius: 12,
    backgroundColor: c.primary,
    alignItems: 'center',
  },
  primaryText: { color: c.white, fontWeight: '700', fontSize: 16 },
}));
