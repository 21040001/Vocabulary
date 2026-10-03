import React from 'react';
import { useT } from '../../../app/settings/SettingsContext';
import { StoredWord } from '../../../services/storage/wordStorage';
import RemovableWordList from '../components/RemovableWordList';

const isFavorite = (x: StoredWord) => x.state.isFavorite;

export default function FavoritesScreen() {
  const t = useT();
  return (
    <RemovableWordList
      title={t('fav.title')}
      emptyText={t('fav.empty')}
      filter={isFavorite}
      removeChanges={{ isFavorite: false }}
      removedMessage={t('fav.removed')}
    />
  );
}
