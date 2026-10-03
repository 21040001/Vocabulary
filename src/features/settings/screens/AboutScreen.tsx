import React from 'react';
import { Linking, Pressable, ScrollView, Text, View } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useSettings } from '../../../app/settings/SettingsContext';
import { APP, SUITE } from '../../../core/config';
import { VOCAB_DB_VERSION } from '../../../services/database/vocabDb';
import type { TKey } from '../../../i18n/strings';
import { makeStyles } from '../../../theme/makeStyles';
import { spacing } from '../../../theme/spacing';

/**
 * Veri kaynakları ve lisansları. CC BY-SA / CC BY lisansları kaynağın adını,
 * lisansını ve bağlantısını göstermeyi şart koşar — bu liste o yüzden var.
 */
const SOURCES: { name: string; what: TKey; license: string; url: string; licenseUrl: string }[] = [
  {
    name: 'Wiktionary',
    what: 'about.src.wiktionary',
    license: 'CC BY-SA 4.0',
    url: 'https://kaikki.org/dictionary/',
    licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/',
  },
  {
    name: 'Tatoeba',
    what: 'about.src.tatoeba',
    license: 'CC BY 2.0 FR',
    url: 'https://tatoeba.org',
    licenseUrl: 'https://creativecommons.org/licenses/by/2.0/fr/',
  },
  {
    name: 'wordfreq',
    what: 'about.src.wordfreq',
    license: 'CC BY-SA 4.0',
    url: 'https://github.com/rspeer/wordfreq',
    licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/',
  },
  {
    name: 'Free Dictionary API',
    what: 'about.src.freedict',
    license: 'CC BY-SA 3.0',
    url: 'https://dictionaryapi.dev',
    licenseUrl: 'https://creativecommons.org/licenses/by-sa/3.0/',
  },
  {
    name: 'Tilmoch (Tahrirchi)',
    what: 'about.src.tilmoch',
    license: '',
    url: 'https://tahrirchi.uz',
    licenseUrl: '',
  },
  {
    name: 'Ionicons',
    what: 'about.src.icons',
    license: 'MIT',
    url: 'https://ionic.io/ionicons',
    licenseUrl: 'https://github.com/ionic-team/ionicons/blob/main/LICENSE',
  },
];

const open = (url: string) => Linking.openURL(url).catch(() => undefined);

export default function AboutScreen() {
  const s = useStyles();
  const { colors, t } = useSettings();

  return (
    <ScrollView style={s.c} contentContainerStyle={s.p}>
      <View style={s.header}>
        <View style={s.logo}>
          <Icon name="language" size={40} color={colors.white} />
        </View>
        <Text style={s.name}>{APP.name}</Text>
        <Text style={s.version}>{t('about.version', { v: APP.version, db: VOCAB_DB_VERSION })}</Text>
        <Text style={s.desc}>{t('about.description', { suite: SUITE.name })}</Text>
      </View>

      <Text style={s.section}>{t('about.sources')}</Text>
      <View style={s.group}>
        {SOURCES.map((x, i) => (
          <View key={x.name} style={[s.source, i > 0 && s.divider]}>
            <Pressable onPress={() => open(x.url)} accessibilityRole="link">
              <Text style={s.sourceName}>
                {x.name} <Icon name="open-outline" size={13} color={colors.primary} />
              </Text>
            </Pressable>
            <Text style={s.sourceWhat}>{t(x.what)}</Text>
            {!!x.license && (
              <Pressable onPress={() => open(x.licenseUrl)} accessibilityRole="link">
                <Text style={s.license}>{t('about.license', { l: x.license })}</Text>
              </Pressable>
            )}
          </View>
        ))}
      </View>
      <Text style={s.note}>{t('about.changesNote')}</Text>

      <Text style={s.section}>{t('about.legal')}</Text>
      <View style={s.group}>
        <Pressable style={s.row} onPress={() => open(SUITE.privacyUrl)} accessibilityRole="link">
          <Icon name="shield-checkmark-outline" size={20} color={colors.textSecondary} />
          <Text style={s.rowText}>{t('about.privacy')}</Text>
          <Icon name="chevron-forward" size={18} color={colors.textSecondary} />
        </Pressable>
        <Pressable
          style={[s.row, s.divider]}
          onPress={() => open(`mailto:${SUITE.contactEmail}`)}
          accessibilityRole="link">
          <Icon name="mail-outline" size={20} color={colors.textSecondary} />
          <Text style={s.rowText}>{t('about.contact')}</Text>
          <Text style={s.rowValue}>{SUITE.contactEmail}</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const useStyles = makeStyles(c => ({
  c: { flex: 1, backgroundColor: c.background },
  p: { padding: spacing.lg, paddingBottom: 40 },
  header: { alignItems: 'center', marginTop: spacing.md },
  logo: {
    width: 76,
    height: 76,
    borderRadius: 20,
    backgroundColor: c.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: { marginTop: spacing.md, fontSize: 22, fontWeight: '700', color: c.text },
  version: { marginTop: 4, color: c.textSecondary },
  desc: { marginTop: spacing.sm, color: c.textSecondary, textAlign: 'center', lineHeight: 20 },
  section: {
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
    fontSize: 13,
    fontWeight: '700',
    color: c.textSecondary,
    textTransform: 'uppercase',
  },
  group: { borderRadius: 14, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, overflow: 'hidden' },
  divider: { borderTopWidth: 1, borderTopColor: c.border },
  source: { paddingHorizontal: spacing.md, paddingVertical: 12 },
  sourceName: { fontSize: 16, fontWeight: '600', color: c.primary },
  sourceWhat: { marginTop: 2, color: c.text },
  license: { marginTop: 2, fontSize: 13, color: c.textSecondary, textDecorationLine: 'underline' },
  note: { marginTop: spacing.sm, fontSize: 12, color: c.textSecondary, lineHeight: 17 },
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.md, paddingVertical: 14, gap: 12 },
  rowText: { flex: 1, fontSize: 16, color: c.text },
  rowValue: { color: c.textSecondary, fontSize: 13 },
}));
