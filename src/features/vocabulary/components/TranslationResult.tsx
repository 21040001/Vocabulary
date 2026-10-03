import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { useT } from '../../../app/settings/SettingsContext';
import { makeStyles } from '../../../theme/makeStyles';
import { spacing } from '../../../theme/spacing';
import { Lang, TranslationGroup } from '../types/word';
import { posLabel } from '../utils/partOfSpeech';
import SpeakButton from './SpeakButton';

type P = {
  word: string;
  lang: Lang;
  audioUrl?: string;
  translations: string[];
  groups?: TranslationGroup[];
  posTags?: string[];
  pronunciation?: string;
  definition?: string;
  example?: string;
  exampleTranslation?: string;
  isMachineTranslation?: boolean;
  isFavorite: boolean;
  onToggleFavorite: () => void;
  isLearned: boolean;
  onToggleLearned: () => void;
  onOpenDetails?: () => void;
};

export default function TranslationResult(p: P) {
  const s = useStyles();
  const t = useT();
  return (
    <View style={s.card}>
      <View style={s.row}>
        <Text style={s.word}>{p.word}</Text>
        <SpeakButton text={p.word} lang={p.lang} audioUrl={p.audioUrl} />
        <Pressable onPress={p.onToggleFavorite} hitSlop={8} style={s.heartBtn}>
          <Text style={s.heart}>{p.isFavorite ? '♥' : '♡'}</Text>
        </Pressable>
      </View>
      {p.pronunciation && <Text style={s.sub}>{p.pronunciation}</Text>}
      {p.groups?.some(g => g.pos) ? (
        p.groups.map((g, i) => (
          <View key={`${g.pos}-${i}`} style={s.groupRow}>
            <Text style={s.pos}>{posLabel(g.pos, t) ?? '—'}</Text>
            <Text style={s.groupText}>{g.translations.join(', ')}</Text>
          </View>
        ))
      ) : (
        <>
          <Text style={s.translation}>{p.translations.join(', ')}</Text>
          {!!p.posTags?.length && (
            <View style={s.tags}>
              {p.posTags.map(tag => (
                <Text key={tag} style={s.pos}>
                  {tag}
                </Text>
              ))}
            </View>
          )}
        </>
      )}
      {p.isMachineTranslation && <Text style={s.badge}>{t('word.machine')}</Text>}
      {p.definition && <Text style={s.definition}>{p.definition}</Text>}
      {p.example && (
        <View style={s.example}>
          <Text style={s.exampleText}>“{p.example}”</Text>
          {p.exampleTranslation && <Text style={s.exampleTrans}>{p.exampleTranslation}</Text>}
        </View>
      )}
      <Pressable style={[s.button, p.isLearned && s.active]} onPress={p.onToggleLearned}>
        <Text style={s.buttonText}>{p.isLearned ? t('word.learnedDone') : t('word.markLearned')}</Text>
      </Pressable>
      {p.onOpenDetails && (
        <Pressable style={s.link} onPress={p.onOpenDetails}>
          <Text style={s.linkText}>{t('word.details')}</Text>
        </Pressable>
      )}
    </View>
  );
}

const useStyles = makeStyles(c => ({
  card: {
    marginTop: spacing.lg,
    padding: spacing.lg,
    borderRadius: 16,
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.border,
  },
  row: { flexDirection: 'row', alignItems: 'center' },
  word: { flex: 1, fontSize: 28, fontWeight: '700', color: c.text },
  heart: { fontSize: 30, color: c.primary },
  heartBtn: { marginLeft: spacing.md },
  sub: { marginTop: spacing.xs, color: c.textSecondary },
  translation: { marginTop: spacing.md, fontSize: 21, fontWeight: '600', color: c.success },
  groupRow: { flexDirection: 'row', alignItems: 'baseline', marginTop: spacing.sm, flexWrap: 'wrap' },
  groupText: { flex: 1, fontSize: 19, fontWeight: '600', color: c.success },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: spacing.sm },
  pos: {
    marginRight: spacing.sm,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    overflow: 'hidden',
    fontSize: 12,
    fontWeight: '700',
    color: c.primary,
    backgroundColor: c.background,
    borderWidth: 1,
    borderColor: c.border,
    textTransform: 'uppercase',
  },
  badge: { marginTop: spacing.xs, fontSize: 12, color: c.textSecondary, fontStyle: 'italic' },
  definition: { marginTop: spacing.md, lineHeight: 22, color: c.textSecondary },
  example: { marginTop: spacing.md, paddingLeft: spacing.sm, borderLeftWidth: 3, borderLeftColor: c.border },
  exampleText: { color: c.text, lineHeight: 22 },
  exampleTrans: { marginTop: 2, color: c.textSecondary, lineHeight: 20 },
  button: { marginTop: spacing.lg, padding: spacing.md, borderRadius: 12, backgroundColor: c.primary, alignItems: 'center' },
  active: { backgroundColor: c.success },
  buttonText: { color: c.white, fontWeight: '600' },
  link: { marginTop: spacing.md, alignItems: 'center' },
  linkText: { color: c.primary, fontWeight: '600' },
}));
