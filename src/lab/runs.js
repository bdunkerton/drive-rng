// One-line summaries of lab runs for the feedback form.

export function describeRunsShort(runs) {
  if (!runs.length) return 'No runs recorded yet.';
  const last = runs[runs.length - 1];
  const bits = [`${runs.length} run${runs.length === 1 ? '' : 's'} since your last feedback.`];
  const latest = [`last: ${last.place ?? '?'} of ${last.of}`];
  if (last.rams) latest.push(`${last.rams} ram${last.rams === 1 ? '' : 's'}`);
  if (last.potatoPassed || last.potatoGot) latest.push(`potato got ${last.potatoGot}, passed ${last.potatoPassed}, booms ${last.potatoBooms}`);
  if (last.vaults) latest.push(`${last.vaults} vault${last.vaults === 1 ? '' : 's'}`);
  if (last.shots) latest.push(`${last.shots} shots, ${last.chainHits} chain hits`);
  if (last.nearMisses || last.focusSeconds) latest.push(`${last.nearMisses} near misses, ${last.focusSeconds}s focus`);
  if (last.spunOut) latest.push(`spun out ${last.spunOut}x`);
  return `${bits[0]} ${latest.join(', ')}.`;
}
