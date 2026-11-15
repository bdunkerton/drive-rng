// Everything the lab remembers between visits: plays and feedback, in browser storage.
// Storage can be missing or throw (private windows, sandboxed frames), so every access is
// wrapped; without it the lab still works, it just forgets on reload.

const KEY = 'drive-rng:lab';

function load() {
  try {
    const raw = window.localStorage.getItem(KEY);
    const data = raw ? JSON.parse(raw) : null;
    if (data && Array.isArray(data.entries)) return { plays: {}, pending: {}, ...data };
  } catch {
    // fall through
  }
  return { entries: [], plays: {}, pending: {} };
}

let data = load();
let memoryOnly = false;

function save() {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(data));
  } catch {
    memoryOnly = true;
  }
}

export const labStore = {
  get memoryOnly() {
    return memoryOnly;
  },
  /** Count a finished play of a scenario (with what happened in it). */
  recordPlay(id, telemetry) {
    data.plays[id] = (data.plays[id] ?? 0) + 1;
    (data.pending[id] ??= []).push(telemetry);
    save();
  },
  plays(id) {
    return data.plays[id] ?? 0;
  },
  /** Plays of this scenario since its last feedback (what the next feedback is about). */
  pendingRuns(id) {
    return data.pending[id] ?? [];
  },
  /** Save feedback for a scenario, attaching the plays it's about. */
  addFeedback(entry) {
    const runs = data.pending[entry.scenario] ?? [];
    data.entries.push({ ...entry, runs, at: Date.now(), sent: false });
    data.pending[entry.scenario] = [];
    save();
  },
  unsent() {
    return data.entries.filter((e) => !e.sent);
  },
  markSent() {
    for (const e of data.entries) e.sent = true;
    save();
  },
  /** Votes so far for one scenario: { up, meh, down }. */
  votes(id) {
    const v = { up: 0, meh: 0, down: 0 };
    for (const e of data.entries) if (e.scenario === id && v[e.vote] !== undefined) v[e.vote]++;
    return v;
  },
};
