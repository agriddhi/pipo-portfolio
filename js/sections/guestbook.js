/* ══════════════════════════════════════════════════════════════
   PIPO — sections/guestbook.js   (Side Quest: Live Guestbook +2)
   The dream wishes on the wall at the bottom of the page.
   Shared through js/shared.js when a backend is configured.
   ══════════════════════════════════════════════════════════════ */

import { audio } from "../audio.js";
import { wishesFeed } from "../shared.js";

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const stamp = (t) =>
  new Date(t || Date.now()).toLocaleString(undefined, { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });

export function initGuestbook({ onPin, name } = {}) {
  const form = document.getElementById("wish-form");
  const list = document.getElementById("wishwall");
  const empty = document.getElementById("wishwall-empty");
  const msg = document.getElementById("wish-msg");
  const nameIn = document.getElementById("wish-name");
  const textIn = document.getElementById("wish-text");
  if (!form || !list) return;

  const feed = wishesFeed();

  function render(items) {
    list.innerHTML = items
      .slice(0, 40)
      .map(
        (w) => `<li>
          <b>&#10022; ${esc(w.from || "nameless")}</b>
          <span>${esc(w.text)}</span>
          <time datetime="${new Date(w.at || Date.now()).toISOString()}">${esc(stamp(w.at))}</time>
        </li>`
      )
      .join("");
    if (empty) empty.hidden = items.length > 0;
  }

  feed.onChange((items, shared) => {
    render(items);
    if (msg && shared && !msg.dataset.sticky) {
      msg.textContent = "shared with everybody · everyone can read this";
    }
  });

  render(feed.items);
  feed.load();

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const text = (textIn.value || "").trim();
    const who = (nameIn.value || "").trim() || name || "a nameless dreamer";

    if (text.length < 3) {
      msg.textContent = "a wish needs at least a few words…";
      msg.classList.add("err");
      msg.dataset.sticky = "1";
      textIn.focus();
      return;
    }

    await feed.add({ text, from: who });

    msg.classList.remove("err");
    msg.dataset.sticky = "1";
    msg.textContent = feed.shared
      ? "pinned for everyone ✦ everyone can read this now"
      : "pinned ✦ saved on this device";
    textIn.value = "";
    onPin?.({ name: who, text });
    audio.sparkle();
  });
}