import React from 'react';
import { StoredWord } from '../../../services/storage/wordStorage';
import RemovableWordList from '../components/RemovableWordList';

const isFavorite = (x: StoredWord) => x.state.isFavorite;

export default function FavoritesScreen() {
  return (
    <RemovableWordList
      title="Favorites"
      emptyText="No favorite words yet."
      filter={isFavorite}
      removeChanges={{ isFavorite: false }}
      removedMessage="removed from favorites"
    />
  );
}