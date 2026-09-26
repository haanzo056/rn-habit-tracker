# Streaks

[![CI](https://github.com/haanzo056/rn-habit-tracker/actions/workflows/ci.yml/badge.svg)](https://github.com/haanzo056/rn-habit-tracker/actions/workflows/ci.yml) ![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?logo=typescript&logoColor=white) ![License](https://img.shields.io/github/license/haanzo056/rn-habit-tracker)

An offline-first habit tracker built with Expo. Mark habits done for the day, keep
streaks going, get a reminder at a set time. Everything lives in SQLite on the device;
if you point it at a server it syncs in the background.

I built it to try out a proper outbox-based sync on mobile and to get streak math
right across timezones, which turned out to be the fiddlier part.

## Stack

Expo SDK 52, Expo Router, TypeScript (strict), Zustand, expo-sqlite, expo-notifications,
Reanimated, i18next (English and Ukrainian). Jest with React Native Testing Library.

## Running it

```sh
npm install
npm start
```

Then open it in a development build or Expo Go. Most of it works in Expo Go; remote
notifications don't, but the local reminders used here do.

To try sync, start the dev server and give the app its URL:

```sh
npm run server
cp .env.example .env    # EXPO_PUBLIC_API_URL=http://localhost:4000
npm start -- --clear
```

On an Android emulator use `http://10.0.2.2:4000`, and on a physical device your
machine's LAN IP. `FAIL_RATE=0.3 npm run server` makes a third of requests fail if you
want to watch the retry logic. `GET /debug` dumps what the server has.

Other scripts: `npm test`, `npm run lint`, `npm run typecheck`, `npm run format`.

Builds go through EAS (`eas build --profile preview`), see `eas.json`.

## Layout

```
app/                  screens (Expo Router)
src/lib/              dates and streak calculation, pure and tested
src/db/               SQLite schema, migrations, queries
src/sync/             outbox push/pull engine, HTTP client, React hook
src/store/            Zustand stores
src/components/       UI pieces
src/notifications/    reminder scheduling
server/               in-memory sync server for local dev
```

## Streaks and timezones

A check-in stores the calendar day (`2024-06-21`) as seen in the device's timezone
when it was made, not a timestamp. "Today" is computed the same way. All day
arithmetic then happens on those strings in UTC, so DST changes can't make a day 23 or
25 hours long.

Rules the streak follows (`src/lib/streaks.ts`):

- today being unchecked doesn't break the streak until the day is over
- on a weekly schedule, unscheduled days are skipped; doing the habit anyway counts
- check-ins dated after today (flew west, or another device ahead of you) are ignored
  until that day comes

## Sync

Local writes go into an outbox table in the same transaction as the data. The sync
engine pushes the outbox, then pulls changes since a server cursor. Conflicts are
last-write-wins on `updatedAt`, deletes are tombstones.

The main trade-offs: LWW relies on device clocks, and it works on whole records, so
two offline edits to different fields of the same habit keep only one. For a personal
habit tracker that's fine. Details, failure handling and the API contract are in
[docs/sync.md](docs/sync.md).

## Known issues / TODO

- Reminders fire even if the habit is already done that day. Needs one-off
  scheduled notifications instead of repeating ones.
- Changing the app language doesn't update the text of already scheduled reminders
  until the habit is saved again.
- The whole check-in history is loaded into memory on start. Fine for years of daily
  use, but should be windowed eventually.
- No accounts or auth; the dev server keeps a single dataset in memory.
- Week always starts on Monday in the weekday picker and history grid.
- Web isn't supported (expo-sqlite on web needs extra setup I haven't done).
