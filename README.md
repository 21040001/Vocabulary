# Vocabulary

React Native CLI + TypeScript vocabulary learning app and Node/Express backend.

This archive contains the application source and backend source. The generated native `android/` and `ios/` folders are not included; create them with the React Native CLI if needed.

## Frontend

`npm install`

For iOS: `cd ios && pod install && cd ..`

Android emulator API: `http://10.0.2.2:3000`.

For a physical device, change the API URL in `src/features/vocabulary/services/wordService.ts` to your computer's LAN IP.

## Offline dictionary

Words are looked up in a bundled SQLite dictionary (`vocab.db`, built from Wiktionary + Tatoeba) before the backend is called. See `KURULUM.md` for how to build and bundle it (`scripts/data-pipeline/build_vocab_db.py`).

## Backend

`cd backend && npm install && copy .env.example .env`

Set `TILMOCH_API_KEY`, then `npm run dev`.
