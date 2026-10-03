import React from 'react';
import { useT } from '../../../app/settings/SettingsContext';
import { StoredWord } from '../../../services/storage/wordStorage';
import { learnedChanges } from '../services/reviewService';
import RemovableWordList from '../components/RemovableWordList';

const isLearned = (x: StoredWord) => x.state.isLearned;

export default function LearnedScreen() {
  const t = useT();
  return (
    <RemovableWordList
      title={t('learned.title')}
      emptyText={t('learned.empty')}
      filter={isLearned}
      // Öğrenilenlerden çıkan kelime tekrar çalışılacaklar arasına (Quiz) döner
      removeChanges={learnedChanges(false)}
      removedMessage={t('learned.removed')}
    />
  );
}
