import { Request, Response } from 'express';
import { getWord } from '../services/wordService';

/** GET /api/words/:word?from=en|uz&translate=1|0 */
export const getWordController = async (req: Request, res: Response) => {
  try {
    const word = String(req.params.word ?? '').trim();
    if (!word || word.length > 60) {
      return res.status(400).json({ message: 'Word is required' });
    }
    const from = req.query.from === 'uz' ? 'uz' : 'en';
    const withTranslation = req.query.translate !== '0';
    return res.json(await getWord(word, from, withTranslation));
  } catch {
    return res.status(404).json({ message: 'Word not found' });
  }
};
