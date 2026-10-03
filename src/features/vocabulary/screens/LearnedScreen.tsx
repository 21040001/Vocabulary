import React from 'react';
import { StoredWord } from '../../../services/storage/wordStorage';
import RemovableWordList from '../components/RemovableWordList';

const isLearned = (x: StoredWord) => x.state.isLearned;

export default function LearnedScreen() {
  return (
    <RemovableWordList
      title="Learned Words"
      emptyText="No learned words yet."
      filter={isLearned}
      // Öğrenilenlerden çıkan kelime tekrar çalışılacaklar arasına (Quiz) döner
      removeChanges={{ isLearned: false, learningStatus: 'learning', nextReviewAt: undefined }}
      removedMessage="moved back to practice"
    />
  );
}