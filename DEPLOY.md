# 🚀 Deploying Pipo

There is no build step. There is no `npm install`. There is no bundler and
nothing that can fail at 2am on the last night. You drag a folder, you get
a URL.

---

## Option 1 — Netlify Drop (easiest, ~2 minutes)

1. Go to **<https://app.netlify.com/drop>**
2. Sign in (a GitHub or email login is fine)
3. **Drag the whole `pipo-portfolio` folder** onto the page
4. Wait ~10 seconds
5. You get a URL like `https://lucky-dragon-9a2f1.netlify.app`
6. Click **Site configuration → Change site name** and make it yours,
   e.g. `pipo-haxbaby.netlify.app`

That is it. `netlify.toml` and `_headers` are already in the folder, so
cache headers and security headers apply automatically.

### The one thing to check the moment it is live

Open the live site and scroll to **the yard** and **the wall**. Each says
either *"shared · everyone's flowers grow here"* or *"saved on this
device"*.

- **shared** → the backend works from your domain.
- **saved on this device** → the browser is blocking the request. Open the
  console, check what failed, and tell me the error.

---

## Option 2 — Cloudflare Pages (also drag and drop)

1. <https://dash.cloudflare.com> → sign up → **Workers & Pages** → **Create**
2. **Pages** → **Upload assets**
3. Drag the `pipo-portfolio` folder in
4. Deploy

`_headers` is honoured here too, so you get the same caching behaviour.

---

## Option 3 — A real domain (optional, if you have one bought)

On Netlify: **Site configuration → Domain management → Add a domain**.
On Cloudflare Pages: **Custom domains → Set up a custom domain**.

---

## What ships

```
36 files · 3.6 MB
```

| | |
|---|---|
| `index.html` | the whole document |
| `css/` | 3 files, ~100 KB |
| `js/` | 21 modules |
| `vendor/` | three.js, GSAP, ScrollTrigger, Lenis — vendored, not CDN |
| `assets/` | two PNGs |
| `netlify.toml`, `_headers` | deploy config |

`vendor/` is committed on purpose. Nothing is fetched from a CDN at
runtime, so **the site cannot break because someone else's server is
having a bad afternoon.** For a 48-hour hackathon judged on "zero console
errors", that is the single most valuable decision in the repo.

---

## 🐙 The GitHub repo (required for submission)

The brief asks for a **public repo with commits dated 17–19 Oct 2026**.
This machine has no `git` installed, so the quickest route is the desktop
app — no terminal, no commands to memorise:

1. Install **GitHub Desktop** (<https://desktop.github.com>)
2. **File → Create a new repository**
   - Name: `pipo` or `haX.baby`
   - Set it to **Public**
   - *Do not* initialise a README here; we already have one
3. **File → Add local repository** → pick `pipo-portfolio`
4. Click **Publish repository**
5. Every commit from here on carries today's date

If you would rather use the terminal, install git from
<https://git-scm.com/downloads>, then:

```bash
cd pipo-portfolio
git init
git add .
git commit -m "Pipo — sakura dragon, haX.baby baby number one"
git branch -M main
git remote add origin https://github.com/YOURNAME/pipo.git
git push -u origin main
```

Once the repo exists you can also connect it to Netlify instead of
dropping the folder, which gives you a new URL on every push.

---

## ✅ Before you submit

- [ ] Live URL opens over **https**, not just localhost
- [ ] The yard says **"shared"**, not "saved on this device"
- [ ] The wish wall says **"shared with everybody"**
- [ ] The leaderboard says **"live · everyone who has ever played"**
- [ ] Open it on your **phone** and scroll the whole page
- [ ] Console is clean (F12 → Console, reload)
- [ ] Repo is public, commits dated 17–19 Oct
- [ ] Character sheet, story write-up and credits are in the README

---

## 🧹 One optional cleanup

`assets/pipo-child.png` is **1.6 MB** — about half the size of everything
else combined. It will load fine on wifi but it is the first thing a judge
on a train would notice.

Squashing it to roughly 300 KB would take the whole site from 3.6 MB to
about 2.3 MB. It does not affect anything else, and it is entirely
optional. Say the word and I will handle it.
