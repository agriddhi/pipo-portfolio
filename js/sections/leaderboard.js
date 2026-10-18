/* ══════════════════════════════════════════════════════════════
   PIPO — sections/leaderboard.js

   The Sneeze Dash leaderboard.

   Your best score goes up on a wall that everybody can see, through
   the same shared backend as the wishes and the pinned stars. It is
   the whole reason the shared wall is worth having: your three
   seconds of chasing petals sits next to a stranger's.

   Identical names collapse into one row showing their best run, and
   a row that is not yours is dimmed slightly so the leaderboard
   reads as a leaderboard and not a guestbook.
   ══════════════════════════════════════════════════════════════ */

import { audio } from "../audio.js";
import { scoresFeed } from "../shared.js";

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

const medal = (i) => (i === 0 ? "✦" : i === 1 ? "✧" : i === 2 ? "✧" : "·");

export function initLeaderboard({ onScore } = {}) {
  const list = document.getElementById("board-list");
  const note = document.getElementById("board-note");
  const form = document.getElementById("board-form");
  const nameIn = document.getElementById("board-name");
  const scoreIn = document.getElementById("board-score");
  const msg = document.getElementById("board-msg");
  if (!list) return null;

  const feed = scoresFeed();
  let mine = "";

  /* one row per player, keeping their best run */
  function rows() {
    const best = new Map();
    for (const s of feed.items) {
      const who = (s.from || "someone").trim().slice(0, 18) || "someone";
      const n = +s.score || 0;
      const cur = best.get(who);
      if (!cur || n > cur.score) best.set(who, { who, score: n, at: s.at });
    }
    return [...best.values()].sort((a, b) => b.score - a.score).slice(0, 12);
  }

  function render() {
    const r = rows();
    if (!r.length) {
      list.innerHTML = `<li class="board__empty">nobody yet. be the first to be competitive about petals.</li>`;
      return;
    }
    const top = r[0].score || 1;
    list.innerHTML = r.map((row, i) => {
      const you = mine && row.who.toLowerCase() === mine.toLowerCase();
      return `<li class="board__row${you ? " is-you" : ""}" style="--w:${Math.max(12, Math.round((row.score / top) * 100))}%">
        <span class="board__rank" aria-hidden="true">${medal(i)}</span>
        <span class="board__who">${esc(row.who)}${you ? " <i>you</i>" : ""}</span>
        <span class="board__bar" aria-hidden="true"></span>
        <b class="board__score">${row.score}</b>
      </li>`;
    }).join("");
  }

  feed.onChange((items, shared) => {
    render();
    if (note) {
      note.textContent = shared
        ? "live · everyone who has ever played"
        : "saved on this device · no connection right now";
      note.classList.toggle("is-local", !shared);
    }
  });
  render();
  feed.load();

  /* ── putting a score up ─────────────────────────────────── */
  async function submit({ name, score }) {
    const who = (name || "").trim().slice(0, 18) || "a nameless dragon";
    const n = Math.max(0, Math.round(+score || 0));
    if (!n) return;

    mine = who;
    await feed.add({ text: "", from: who, score: n });
    render();
    onScore?.({ name: who, score: n });
    return true;
  }

  /* the game calls this itself when a run ends */
  form?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const who = (nameIn.value || "").trim().slice(0, 18);
    const n = Math.round(+scoreIn.value || 0);
    if (!who || !n) {
      if (msg) msg.textContent = "a name and a score, please.";
      return;
    }
    await submit({ name: who, score: n });
    if (msg) {
      msg.textContent = feed.shared
        ? "✦ on the wall. everybody can see that."
        : "✦ pinned locally. no connection, so it's just yours for now.";
      nameIn.value = "";
    }
    audio.sparkle();
  });

  return {
    submit, render,
    get shared() { return feed.shared; },
    get top() { return rows()[0] || null; },
    get count() { return rows().length; },
  };
}
