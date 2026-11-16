// Turns saved lab feedback into text for Claude: a readable summary plus the raw numbers,
// posted as a GitHub issue (labelled "playtest") or copied to paste into chat.

import { LAB_VERSION, scenarioById } from './scenarios.js';

export const ISSUE_REPO = 'bdunkerton/drive-rng';
const MAX_URL = 7800; // GitHub refuses very long new-issue URLs

const VOTE_WORDS = { up: 'UPVOTE', meh: 'MEH', down: 'DOWNVOTE' };

function describeRuns(runs) {
  if (!runs.length) return 'No finished runs recorded.';
  const avg = (key) => Math.round((runs.reduce((a, r) => a + (r[key] ?? 0), 0) / runs.length) * 10) / 10;
  const places = runs.map((r) => (r.place ? `${r.place}/${r.of}` : 'dnf')).join(', ');
  const bits = [`${runs.length} run(s), places ${places}`];
  const add = (label, key) => {
    const v = avg(key);
    if (v) bits.push(`${label} ${v}`);
  };
  add('rams', 'rams');
  add('spun out', 'spunOut');
  add('draft s', 'draftSeconds');
  add('potato got', 'potatoGot');
  add('potato passed', 'potatoPassed');
  add('potato booms', 'potatoBooms');
  add('vaults', 'vaults');
  add('shots', 'shots');
  add('chain hits', 'chainHits');
  add('near misses', 'nearMisses');
  add('focus s', 'focusSeconds');
  add('wall hits', 'wallHits');
  add('time bomb uses', 'bombUses');
  add('karts charged', 'charged');
  add('bomb spins', 'bombSpins');
  add('bomb chains', 'bombChains');
  add('spun by hunters', 'huntedSpins');
  add('knocked out at s', 'outAt');
  add('most potatoes at once', 'potatoesMax');
  add('busts', 'busts');
  add('cops spun', 'copsSpun');
  add('traffic spun', 'trafficHit');
  add('auto slingshots', 'autoSlingshots');
  const caught = runs.filter((r) => r.caught).length;
  if (caught) bits.push(`caught in ${caught} of ${runs.length}`);
  return `${bits.join(' · ')} (averages per run)`;
}

export function buildReport(entries) {
  const lines = [`Playtest feedback from the lab (${LAB_VERSION}), ${entries.length} entr${entries.length === 1 ? 'y' : 'ies'}.`, ''];
  for (const e of entries) {
    const s = scenarioById(e.scenario);
    lines.push(`### ${s?.name ?? e.scenario} — ${VOTE_WORDS[e.vote] ?? 'NO VOTE'}`);
    if (e.tags?.length) lines.push(`Tags: ${e.tags.join(', ')}`);
    if (e.note) lines.push(`Note: ${e.note}`);
    lines.push(`Runs: ${describeRuns(e.runs ?? [])}`);
    lines.push('');
  }
  const raw = entries.map((e) => ({ s: e.scenario, v: e.vote, tags: e.tags, note: e.note, runs: e.runs, at: e.at }));
  const human = lines.join('\n');
  return { human, raw, text: `${human}\n<details><summary>raw data</summary>\n\n\`\`\`json\n${JSON.stringify(raw)}\n\`\`\`\n</details>\n` };
}

/** A new-issue URL with the report filled in (raw data dropped if the URL would be too long). */
export function issueUrl(entries) {
  const report = buildReport(entries);
  const names = [...new Set(entries.map((e) => scenarioById(e.scenario)?.name ?? e.scenario))];
  const title = `Playtest: ${names.join(', ')}`.slice(0, 120);
  const make = (body) =>
    `https://github.com/${ISSUE_REPO}/issues/new?labels=playtest&title=${encodeURIComponent(title)}&body=${encodeURIComponent(body)}`;
  let url = make(report.text);
  if (url.length > MAX_URL) url = make(`${report.human}\n(Raw data was too long for the link; the summary above has the averages.)`);
  if (url.length > MAX_URL) url = make(report.human.slice(0, 5000));
  return { url, text: report.text };
}
