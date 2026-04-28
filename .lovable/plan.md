# Fix LocalStorage Race in Persisted Store

## Root cause

The app uses zustand `persist` (`src/lib/store.ts`, key `dnd2024-vault`) with default `localStorage`. The Lovable preview commonly has the app mounted in more than one context at the same time (e.g. editor preview iframe + a separately opened preview tab, or HMR remounts). Each instance:

1. Reads LocalStorage once at startup into its own in-memory copy.
2. Writes its full state back on every mutation.

There is no listener for the browser `storage` event, so instance B never sees instance A's writes. Whichever tab the user clicks in last overwrites LocalStorage with its stale snapshot, producing the "alternates between two saved states / two different characters" symptom.

## Fix (minimal, no rebuild)

Edit only `src/lib/store.ts`. Two small additions inside the `persist(...)` config:

1. Add an `onRehydrateStorage` hook that, on first hydration in the browser, attaches a `window.addEventListener('storage', ...)` listener. When the `storage` event fires for key `dnd2024-vault`, call `useAppStore.persist.rehydrate()` so this tab picks up the other tab's write instead of overwriting it later.

2. Add a lightweight write-guard: before each `setState`-triggered persist write, compare the `state.version`/timestamp of what's currently in LocalStorage to what we're about to write. If LocalStorage already holds a newer payload (i.e. another tab wrote after our last rehydrate), call `rehydrate()` first and merge, instead of clobbering. Implementation: wrap the default storage via `createJSONStorage` and override `setItem` to do this check.

No schema change, no migration bump, no UI change. Existing data in LocalStorage continues to load.

## Technical details

- File: `src/lib/store.ts` only.
- Imports to add: `createJSONStorage` from `zustand/middleware`.
- `storage` option: `createJSONStorage(() => guardedLocalStorage)` where `guardedLocalStorage` wraps `window.localStorage` and on `setItem` checks the existing serialized record's nested `state.updatedAt`-equivalent (we'll use the max `updatedAt` across `characters` plus a monotonically incremented `_writeSeq` we add into the persisted payload). If existing seq > our last-known seq, trigger rehydrate and skip the stale write; the next mutation will write cleanly.
- `onRehydrateStorage`: returns a function that, once on the client, registers a single `storage` listener (guarded by a module-level boolean) calling `useAppStore.persist.rehydrate()` when `e.key === 'dnd2024-vault'`.
- SSR-safe: all `window` access guarded by `typeof window !== 'undefined'`.

## Out of scope

- No changes to components, types, or routing.
- No change to the persist `name` or `version`.
- No new dependencies.
