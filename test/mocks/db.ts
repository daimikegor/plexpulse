import { vi } from 'vitest';

interface InsertCall {
  values: any;
  conflict?: { target: any; set: any };
}

/**
 * Fluent fake matching the exact drizzle chains used by lib/session.ts
 * (db.select().from().where().get()) and lib/plex-library.ts
 * (db.insert().values().onConflictDoUpdate()).
 */
export function createMockDb(initialSelectResult: any = undefined) {
  let selectResult = initialSelectResult;
  const insertCalls: InsertCall[] = [];

  const db = {
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          get: vi.fn(async () => selectResult),
        })),
      })),
    })),

    insert: vi.fn(() => {
      let pendingValues: any;
      return {
        values: vi.fn((values: any) => {
          pendingValues = values;
          return {
            onConflictDoUpdate: vi.fn(async (conflict: { target: any; set: any }) => {
              insertCalls.push({ values: pendingValues, conflict });
            }),
          };
        }),
      };
    }),
  };

  return {
    db,
    insertCalls,
    setSelectResult: (row: any) => {
      selectResult = row;
    },
  };
}
