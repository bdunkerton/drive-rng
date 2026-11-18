// The lab's HTML panels, drawn over the canvas: the feedback form after a scenario, and
// the "send to Claude" panel. Plain DOM, styled to match the game's dark panels.

import { labStore } from './store.js';
import { issueUrl } from './report.js';

const TAGS = ['FUN', 'FELT COOL', 'WANT MORE', 'SKILL MATTERED', 'CONFUSING', 'HARD TO SEE', 'TOO RANDOM', 'TOO HARD', 'TOO EASY', 'BORING'];

let styled = false;
function addStyles() {
  if (styled) return;
  styled = true;
  const css = document.createElement('style');
  css.textContent = `
  .lab-overlay { position: fixed; inset: 0; display: flex; align-items: center; justify-content: center;
    background: rgba(10,8,16,0.6); z-index: 10; font: 14px/1.4 ui-monospace, Menlo, Consolas, monospace; color: #f2efe6; }
  .lab-panel { background: #16141f; border: 2px solid #4b4660; padding: 18px 20px; width: min(560px, 92vw);
    max-height: 92vh; overflow: auto; box-shadow: 0 8px 0 #0a0910; }
  .lab-panel h2 { margin: 0 0 4px; font-size: 18px; color: #f2c14b; letter-spacing: 1px; }
  .lab-panel .q { color: #c8ccd6; margin: 0 0 12px; }
  .lab-panel .runs { color: #9aa0aa; font-size: 12px; margin: 0 0 14px; }
  .lab-row { display: flex; flex-wrap: wrap; gap: 8px; margin: 0 0 12px; }
  .lab-panel button { font: inherit; color: #f2efe6; background: #2a2738; border: 2px solid #4b4660; padding: 7px 12px; cursor: pointer; }
  .lab-panel button:hover { border-color: #f2c14b; }
  .lab-panel button.on { background: #f2c14b; color: #14121a; border-color: #f2c14b; }
  .lab-panel button.vote { flex: 1; font-size: 15px; padding: 10px; }
  .lab-panel button.vote.up.on { background: #5ec46a; border-color: #5ec46a; }
  .lab-panel button.vote.down.on { background: #f05a4a; border-color: #f05a4a; }
  .lab-panel button.tag { font-size: 12px; padding: 4px 8px; }
  .lab-panel textarea { width: 100%; box-sizing: border-box; min-height: 90px; font: inherit; color: #f2efe6;
    background: #0e0d15; border: 2px solid #4b4660; padding: 8px; resize: vertical; }
  .lab-panel textarea:focus { outline: none; border-color: #f2c14b; }
  .lab-panel .actions { display: flex; flex-wrap: wrap; gap: 8px; justify-content: flex-end; margin-top: 12px; }
  .lab-panel .primary { background: #f2c14b; color: #14121a; border-color: #f2c14b; }
  .lab-panel .hint { color: #9aa0aa; font-size: 12px; margin-top: 8px; }
  .lab-panel pre { white-space: pre-wrap; background: #0e0d15; border: 2px solid #4b4660; padding: 8px; font-size: 12px; max-height: 40vh; overflow: auto; }
  `;
  document.head.appendChild(css);
}

function el(tag, attrs = {}, ...kids) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') e.className = v;
    else if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
    else e.setAttribute(k, v);
  }
  for (const kid of kids) e.append(kid);
  return e;
}

function overlay(panel, onEscape) {
  addStyles();
  const o = el('div', { class: 'lab-overlay' }, panel);
  const keys = (e) => {
    e.stopPropagation();
    if (e.key === 'Escape') onEscape();
  };
  o.addEventListener('keydown', keys);
  document.body.appendChild(o);
  return () => o.remove();
}

/**
 * Feedback form for one scenario.
 * @param {{ scenario: import('./scenarios.js').Scenario, runsText: string, onClose: (next: 'again'|'lab'|'cancel') => void }} opts
 */
export function openFeedback({ scenario, runsText, onClose }) {
  let vote = null;
  const tags = new Set();
  const voteButtons = [
    ['up', 'KEEP IT ▲'],
    ['meh', 'MEH'],
    ['down', 'DROP IT ▼'],
  ].map(([v, label]) => {
    const b = el('button', { class: `vote ${v}`, type: 'button' }, label);
    b.addEventListener('click', () => {
      vote = v;
      voteButtons.forEach((x) => x.classList.toggle('on', x === b));
    });
    return b;
  });
  const tagButtons = TAGS.map((t) => {
    const b = el('button', { class: 'tag', type: 'button' }, t);
    b.addEventListener('click', () => {
      if (tags.has(t)) tags.delete(t);
      else tags.add(t);
      b.classList.toggle('on', tags.has(t));
    });
    return b;
  });
  const note = el('textarea', { placeholder: 'What happened? What felt good, what felt bad, what would you change?' });
  let close = () => {};
  const finish = (next) => {
    if (next !== 'cancel') {
      labStore.addFeedback({ scenario: scenario.id, vote, tags: [...tags], note: note.value.trim() });
    }
    close();
    onClose(next);
  };
  const panel = el(
    'div',
    { class: 'lab-panel' },
    el('h2', {}, scenario.name),
    el('p', { class: 'q' }, scenario.question),
    el('p', { class: 'runs' }, runsText),
    el('div', { class: 'lab-row' }, ...voteButtons),
    el('div', { class: 'lab-row' }, ...tagButtons),
    note,
    el(
      'div',
      { class: 'actions' },
      el('button', { type: 'button', onclick: () => finish('cancel') }, 'CANCEL'),
      el('button', { type: 'button', onclick: () => finish('lab') }, 'SAVE & BACK TO LAB'),
      el('button', { type: 'button', class: 'primary', onclick: () => finish('again') }, 'SAVE & PLAY AGAIN'),
    ),
    el('div', { class: 'hint' }, 'Vote and tags are optional. Saved on this computer; send it all to Claude from the lab menu.'),
  );
  close = overlay(panel, () => finish('cancel'));
  setTimeout(() => note.focus(), 0);
}

/** The "send to Claude" panel: post everything unsent as a GitHub issue, or copy it. */
export function openSend({ onClose }) {
  const entries = labStore.unsent();
  let close = () => {};
  const done = () => {
    close();
    onClose();
  };
  if (!entries.length) {
    const panel = el('div', { class: 'lab-panel' }, el('h2', {}, 'NOTHING TO SEND'), el('p', { class: 'q' }, 'Play a scenario and leave feedback first.'),
      el('div', { class: 'actions' }, el('button', { type: 'button', class: 'primary', onclick: done }, 'OK')));
    close = overlay(panel, done);
    return;
  }
  const { url, text } = issueUrl(entries);
  const status = el('div', { class: 'hint' }, '');
  const panel = el(
    'div',
    { class: 'lab-panel' },
    el('h2', {}, `SEND ${entries.length} FEEDBACK ENTR${entries.length === 1 ? 'Y' : 'IES'} TO CLAUDE`),
    el('p', { class: 'q' }, 'Post it as a GitHub issue on the repo (Claude reads those), or copy it and paste it into the chat.'),
    el('pre', {}, text),
    el(
      'div',
      { class: 'actions' },
      el('button', { type: 'button', onclick: done }, 'CLOSE'),
      el('button', {
        type: 'button',
        onclick: async () => {
          try {
            await navigator.clipboard.writeText(text);
            labStore.markSent();
            status.textContent = 'Copied. Paste it into the chat with Claude.';
          } catch {
            status.textContent = 'Copy was blocked by the browser: select the text above and copy it by hand.';
          }
        },
      }, 'COPY TEXT'),
      el('button', {
        type: 'button',
        class: 'primary',
        onclick: () => {
          window.open(url, '_blank', 'noopener');
          labStore.markSent();
          status.textContent = 'Opened GitHub in a new tab. Press "Submit new issue" there.';
        },
      }, 'POST TO GITHUB'),
    ),
    status,
  );
  close = overlay(panel, done);
}
