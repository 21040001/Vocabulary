import { useEffect, useRef, useState } from 'react';

import { searchSuggestions, Suggestion } from '../services/dictionaryService';
import { Lang } from '../types/word';

/**
 * Yazarken yerel sözlükten öneri getirir (150 ms bekleyerek).
 * Eski sorgunun geç gelen sonucu yenisinin üstüne yazılmaz.
 */
export default function useSuggestions(query: string, lang: Lang, enabled = true) {
  const [items, setItems] = useState<Suggestion[]>([]);
  const reqId = useRef(0);

  useEffect(() => {
    const id = ++reqId.current;
    if (!enabled || !query.trim()) {
      setItems([]);
      return;
    }
    const t = setTimeout(() => {
      searchSuggestions(query, lang)
        .then(r => id === reqId.current && setItems(r))
        .catch(() => id === reqId.current && setItems([]));
    }, 150);
    return () => clearTimeout(t);
  }, [query, lang, enabled]);

  return items;
}
