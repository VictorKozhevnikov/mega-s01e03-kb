// Splits a merged ticket into the problems its reports actually describe.
// Built on causes.ts (tenant + channel decide parser vs hint) and desk-notes.json (reports the desk
// read as a one-day move). Counts follow the desk's own view (CauseTable): every report sits under its
// cause by tenant and channel. A one-day move cannot come from swapping day and month, so it also gets
// a row and a ticket of its own; those reports stay counted under the cause they are filed by.
import { causeOf, uniqueById, type Report, type Tenant } from '#lib/kb/causes';

export type Problem = 'parser' | 'hint' | 'one-day' | 'unplaced';
export const PROBLEMS: readonly Problem[] = ['parser', 'hint', 'one-day', 'unplaced'];

export function problemsOf(r: Report, t: Tenant | undefined, oneDayMove: readonly string[]): Problem[] {
  const filed: Problem = causeOf(r, t) ?? 'unplaced';
  return oneDayMove.includes(r.id) ? [filed, 'one-day'] : [filed];
}

export type ProblemGroup = {
  problem: Problem;
  reports: Report[];
  tenants: number;
  channels: Record<string, number>;
  firstSeen: string;
  lastSeen: string;
};

export function splitTicket(
  all: Report[],
  ticket: number,
  tenantOf: (r: Report) => Tenant | undefined,
  oneDayMove: readonly string[],
): { merged: Report[]; rows: number; groups: ProblemGroup[] } {
  const merged = uniqueById(all).filter((r) => r.mergedInto === ticket);
  const by = new Map<Problem, Report[]>();
  for (const r of merged) {
    for (const p of problemsOf(r, tenantOf(r), oneDayMove)) by.set(p, [...(by.get(p) ?? []), r]);
  }
  const groups = PROBLEMS.flatMap((problem) => {
    const rs = by.get(problem);
    if (!rs?.length) return [];
    const days = rs.map((r) => r.receivedAt.slice(0, 10)).sort();
    return [
      {
        problem,
        reports: rs,
        tenants: new Set(rs.map((r) => r.tenant)).size,
        channels: rs.reduce<Record<string, number>>((n, r) => ({ ...n, [r.channel]: (n[r.channel] ?? 0) + 1 }), {}),
        firstSeen: days[0],
        lastSeen: days[days.length - 1],
      },
    ];
  });
  return { merged, rows: all.filter((r) => r.mergedInto === ticket).length, groups };
}

// How many reports intake tagged with a cause other than the one tenant + channel give.
export function mistagged(merged: Report[], tenantOf: (r: Report) => Tenant | undefined): number {
  return merged.filter((r) => {
    const c = causeOf(r, tenantOf(r));
    return c !== null && r.meta.intakeTag !== c;
  }).length;
}
