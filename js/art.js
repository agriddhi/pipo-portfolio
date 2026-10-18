/* ══════════════════════════════════════════════════════════════
   PIPO — art.js
   Placeholder art, drawn in the same palette as the character
   sheets. If a real image is missing, this swaps in so the page
   never looks broken — and if it is present, nothing happens.
   ══════════════════════════════════════════════════════════════ */

const BODY = "#fbe4ec";
const BELLY = "#fff6ec";
const HORN = "#f7dcab";
const WING = "#e8799f";
const BLUSH = "#f4a6c0";
const INK = "#3a2350";
const EYE = "#7f93e8";

const blossom = (x, y, r = 7) => `
  <g transform="translate(${x} ${y})" fill="${BLUSH}" opacity=".95">
    ${[0, 72, 144, 216, 288].map((a) => `<ellipse cx="0" cy="${-r}" rx="${r * 0.55}" ry="${r}" transform="rotate(${a})"/>`).join("")}
    <circle r="${r * 0.42}" fill="#f7dcab"/>
  </g>`;

function chibiSVG() {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400">
    <defs><radialGradient id="glow" cx="50%" cy="42%">
      <stop offset="0%" stop-color="#fff" stop-opacity=".9"/><stop offset="100%" stop-color="#fff" stop-opacity="0"/>
    </radialGradient></defs>
    <circle cx="200" cy="190" r="190" fill="url(#glow)"/>

    <path d="M150 250 C 110 300, 120 350, 190 352 C 260 354, 300 320, 282 286"
          fill="none" stroke="${BODY}" stroke-width="26" stroke-linecap="round"/>
    <path d="M282 286 q 22 6 26 30 q -14 -18 -34 -14 z" fill="${BLUSH}"/>

    <g fill="${WING}" opacity=".9">
      <path d="M150 214 q -62 -52 -104 -22 q 34 6 44 30 q -26 4 -34 24 q 40 -12 92 -8 z"/>
      <path d="M250 214 q 62 -52 104 -22 q -34 6 -44 30 q 26 4 34 24 q -40 -12 -92 -8 z"/>
    </g>

    <ellipse cx="200" cy="268" rx="92" ry="78" fill="${BODY}"/>
    <ellipse cx="206" cy="286" rx="58" ry="48" fill="${BELLY}"/>

    <circle cx="200" cy="160" r="70" fill="${BODY}"/>
    <g fill="${HORN}">
      <path d="M168 106 q -18 -34 -6 -54 q 4 30 16 48 z"/>
      <path d="M232 106 q 18 -34 6 -54 q -4 30 -16 48 z"/>
    </g>
    <g>
      <ellipse cx="178" cy="158" rx="17" ry="20" fill="${INK}"/>
      <ellipse cx="178" cy="158" rx="12" ry="15" fill="${EYE}"/>
      <ellipse cx="222" cy="158" rx="17" ry="20" fill="${INK}"/>
      <ellipse cx="222" cy="158" rx="12" ry="15" fill="${EYE}"/>
      <circle cx="174" cy="151" r="5" fill="#fff"/>
      <circle cx="218" cy="151" r="5" fill="#fff"/>
    </g>
    <path d="M188 186 q 12 12 24 0" fill="none" stroke="${INK}" stroke-width="3.5" stroke-linecap="round"/>
    <ellipse cx="164" cy="180" rx="9" ry="5" fill="${BLUSH}" opacity=".7"/>
    <ellipse cx="236" cy="180" rx="9" ry="5" fill="${BLUSH}" opacity=".7"/>

    ${blossom(120, 236, 13)}${blossom(280, 226, 11)}${blossom(238, 330, 9)}${blossom(96, 300, 8)}
  </svg>`;
}

function adultSVG() {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 520">
    <defs><radialGradient id="glow2" cx="50%" cy="38%">
      <stop offset="0%" stop-color="#fff" stop-opacity=".85"/><stop offset="100%" stop-color="#fff" stop-opacity="0"/>
    </radialGradient></defs>
    <circle cx="200" cy="230" r="240" fill="url(#glow2)"/>

    <path d="M214 150 C 120 180, 96 300, 190 360 C 280 416, 352 380, 336 322 C 324 280, 286 288, 288 320 C 290 344, 268 356, 244 340"
          fill="none" stroke="${BODY}" stroke-width="30" stroke-linecap="round"/>
    <path d="M336 322 q 26 -4 34 22 q -22 -12 -44 -2 z" fill="${BLUSH}"/>

    <g fill="${WING}" opacity=".85">
      <path d="M176 214 q -84 -62 -138 -24 q 46 6 60 38 q -34 6 -44 32 q 54 -16 120 -10 z"/>
    </g>

    <ellipse cx="214" cy="212" rx="86" ry="98" fill="${BODY}"/>
    <ellipse cx="222" cy="236" rx="52" ry="64" fill="${BELLY}"/>
    ${blossom(150, 190, 15)}${blossom(262, 176, 13)}${blossom(238, 300, 12)}${blossom(120, 268, 11)}

    <ellipse cx="212" cy="96" rx="66" ry="60" fill="${BODY}"/>
    <g fill="${HORN}">
      <path d="M182 52 q -22 -38 -8 -60 q 6 34 20 54 z"/>
      <path d="M242 52 q 22 -38 8 -60 q -6 34 -20 54 z"/>
    </g>
    <g>
      <ellipse cx="192" cy="94" rx="16" ry="19" fill="${INK}"/>
      <ellipse cx="192" cy="94" rx="11" ry="14" fill="${EYE}"/>
      <ellipse cx="234" cy="94" rx="16" ry="19" fill="${INK}"/>
      <ellipse cx="234" cy="94" rx="11" ry="14" fill="${EYE}"/>
      <circle cx="188" cy="88" r="4.5" fill="#fff"/>
      <circle cx="230" cy="88" r="4.5" fill="#fff"/>
    </g>
    <path d="M200 122 q 11 10 22 0" fill="none" stroke="${INK}" stroke-width="3.4" stroke-linecap="round"/>
  </svg>`;
}

const cache = {};
export function placeholder(which = "chibi") {
  cache[which] ||= `data:image/svg+xml,${encodeURIComponent(which === "adult" ? adultSVG() : chibiSVG())}`;
  return cache[which];
}

/** swap any broken <img> for the placeholder art.
    Hero depth layers are excluded — hero.js hides missing ones itself,
    otherwise you get four identical dragons stacked on each other. */
export function guardArt(root = document) {
  root.querySelectorAll("img").forEach((img) => {
    if (img.dataset.guarded || img.classList.contains("hero__layer")) return;
    img.dataset.guarded = "1";

    const swap = () => {
      const which = /adult/i.test(img.src) ? "adult" : "chibi";
      img.src = placeholder(which);
      img.dataset.placeholder = "1";
      console.info("[pipo] no artwork at " + img.getAttribute("src") + " - using the drawn placeholder");
    };

    img.addEventListener("error", swap);

    // the 404 may already have happened before this ran
    if (img.complete && img.naturalWidth === 0) swap();
  });
}