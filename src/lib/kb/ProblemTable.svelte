<script lang="ts">
  import reports from '#lib/data/reports-4471.json';
  import notes from '#lib/data/desk-notes.json';
  import type { Report } from '#lib/kb/causes';
  import { tenantOf } from '#lib/kb/locales';
  import { mistagged, splitTicket, type Problem } from '#lib/kb/problems';

  type Link = { href: string; label: string; what: string };
  let { ticket, tickets }: { ticket: number; tickets: Partial<Record<Problem, Link>> } = $props();

  const split = $derived(splitTicket(reports as Report[], ticket, tenantOf, notes.oneDayMove));
  const wrongTag = $derived(mistagged(split.merged, tenantOf));
  const chan = (c: Record<string, number>) =>
    Object.entries(c)
      .sort((a, b) => b[1] - a[1])
      .map(([k, n]) => `${k} ×${n}`)
      .join(' · ');
</script>

<p class="sum">
  <strong>{split.merged.length}</strong> reports in #{ticket} ({split.rows} rows in the export, {split.rows -
    split.merged.length} of them repeats) ·
  <strong>{split.groups.length}</strong>
  {split.groups.length === 1 ? 'problem' : 'problems'}
</p>

<table>
  <thead>
    <tr><th>problem</th><th>reports</th><th>channels</th><th>tenants</th><th>seen</th><th>ticket</th></tr>
  </thead>
  <tbody>
    {#each split.groups as g (g.problem)}
      {@const t = tickets[g.problem]}
      <tr class:open={!t}>
        <td><code>{g.problem}</code>{#if t}<br /><span class="what">{t.what}</span>{/if}</td>
        <td><strong>{g.reports.length}</strong>{#if g.problem === 'one-day'}<br /><span class="what">also counted under the cause they are filed by</span>{/if}</td>
        <td class="muted">{chan(g.channels)}</td>
        <td>{g.tenants}</td>
        <td class="muted">{g.firstSeen} → {g.lastSeen}</td>
        <td>{#if t}<a href={t.href}>{t.label}</a>{:else}no ticket yet{/if}</td>
      </tr>
    {/each}
  </tbody>
</table>

<p class="muted">
  Intake's tag disagrees with the tenant and channel on <strong>{wrongTag}</strong> of these reports. The tag
  is a guess from the reporter's browser; this table does not use it.
</p>

<style>
  .sum { font-size: 1.1rem; }
  .muted, .what { color: var(--muted); font-size: 0.85em; }
  .open td { background: var(--warn-bg); }
</style>
