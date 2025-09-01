# Sync

The app works entirely against a local SQLite database. Sync is optional and runs in
the background when `EXPO_PUBLIC_API_URL` is set. Nothing in the UI waits on the network.

## Data model

Two synced tables, `habits` and `checkins`. Every row carries:

- `id` - generated on the client
- `updatedAt` - ISO timestamp, set by the client on every write
- `deletedAt` - `null`, or the time the row was deleted

Deletes are soft. A deleted row is a tombstone that syncs like any other write, which
is the only way another device can learn that something was removed. Unchecking a day
is also a delete (a tombstoned check-in).

Check-in ids are `${habitId}:${day}` rather than random. If two devices check in the
same habit on the same day while offline, they write the same id and LWW collapses
them into one row instead of producing a duplicate that would double-count.

`day` is a `YYYY-MM-DD` string in the device's timezone at the time of the check-in.
It's stored, not derived, so a check-in made at 23:50 in Kyiv stays on that date after
you fly to New York.

## Outbox

Every local write happens in one transaction with an insert into `outbox`:

```
outbox(id, entity, entity_id, payload, attempts, last_error)
unique(entity, entity_id)
```

The payload is the full record, so only the newest version of a row matters. Writing
the same entity again replaces its outbox row (`INSERT OR REPLACE`), which deletes the
old row and inserts a new one with a new `id`.

That new id matters. A push reads a batch of outbox rows, sends them, and then deletes
those rows by id. If the user edits a habit while its old version is in flight, the
edit lands in a fresh row that the delete doesn't touch, and it goes out in the next
batch. An earlier version used `ON CONFLICT DO UPDATE`, which kept the id and silently
dropped such edits.

## A sync run

`createSyncEngine(api, storage).sync()`:

1. **Push.** Read up to 100 outbox rows, `POST /sync/push`, delete them on success.
   Repeat until the outbox is empty.
2. **Pull.** `GET /sync/pull?since=<cursor>`, for each record compare with the local
   copy, write the winners and the new cursor in one transaction. Repeat while
   `hasMore`.

Push goes first so that the server already has our pending edits when we pull. The
other order works too thanks to LWW, but it does extra writes that get overwritten.

Concurrent calls to `sync()` share the in-flight run instead of starting a second one.

### Conflict resolution

Last write wins on `updatedAt`, applied on both sides:

- The server keeps the incoming record unless its stored copy is strictly newer.
- The client applies a pulled record unless its local copy is strictly newer. Ties go
  to the server copy so all devices converge.

Timestamps are compared as instants (`Date.parse`), not strings, so `+03:00` and `Z`
forms compare correctly.

### Cursor

The cursor is an opaque string the server hands out. The dev server uses a
monotonically increasing sequence number assigned when it accepts a write. It is
deliberately not a timestamp: "give me everything updated after T" misses rows written
by a device whose clock is behind.

A device pulls back its own pushes. That's harmless (same `updatedAt`, tie goes to the
server, same data is rewritten) and not worth the complexity of filtering by device.

### Failures

| What happened               | What we do                                     |
| --------------------------- | ---------------------------------------------- |
| Network error, timeout, 5xx | Leave the outbox alone, retry with backoff     |
| 408 / 429                   | Same as 5xx                                    |
| Other 4xx on push           | Increment `attempts` on every row in the batch |
| `attempts` reaches 5        | Row is skipped from now on, shown as failed    |

Backoff is 5s, 10s, 20s, ... capped at 5 minutes. It resets when a sync succeeds or
the device comes back online. Settings has a Retry button that resets failed rows.

### Triggers

`useSync` starts a run:

- on app start
- when NetInfo reports the device came back online
- when the app returns to the foreground
- 2 seconds after the last local write (debounced)
- every 5 minutes while idle

## Trade-offs and known problems

**Clock skew.** LWW trusts client clocks. A phone that's 10 minutes fast wins every
conflict within that window. For a single user with a couple of devices this is
acceptable; a hybrid logical clock would fix it if it ever matters.

**Whole-record LWW.** Renaming a habit on one device and changing its color on another
while both are offline keeps only one of the two edits. Field-level merge would need
per-field timestamps. Habits are edited rarely, so this hasn't been worth it.

**One bad record blocks a batch.** The server rejects a push as a whole on 400. After
five attempts the entire batch is dead-lettered, including good rows that happened to
be in it. The fix is per-record results from `/sync/push`.

**Tombstones are never purged.** Fine at habit-tracker volumes. A real backend would
compact tombstones older than the oldest active cursor.

**No auth.** The dev server has one global dataset. A real deployment needs a user
scope on every query and a token in the client (`createHttpApi` is the place for it).

## API contract

```
POST /sync/push
{ "habits": Habit[], "checkins": Checkin[] }
-> 200 { "ok": true }

GET /sync/pull?since=<cursor>
-> 200 { "habits": Habit[], "checkins": Checkin[], "cursor": string, "hasMore": boolean }
```

Omit `since` on first sync. Records are the same shape as `src/types/habit.ts`.
