/* ══════════════════════════════════════════════════════════════
   PIPO — pipo.js

   A chibi sakura dragon, built entirely from primitives at runtime.
   No 3D file to download and no licence to credit.

   Built to match the reference artwork, feature for feature:

     · WINGLESS. She is a floater, not a flier. No wings at all —
       the rig keeps an empty wings array so the animator stays happy.
     · branching cream ANTLER horns, wide and stag-like, sweeping up
       and outward with tines off the main beam
     · an enormous blue sparkly eye with a dark rim, two highlights
       and a tiny star sparkle in the iris
     · a big soft mane of lilac-pink hair, swept to one side, sitting
       behind and around the skull
     · a chubby round body covered in OVERLAPPING SCALLOP SCALES that
       run pink at the belly through lilac to pale blue at the top
     · stubby legs with three little cream claws each
     · a long fluffy curled tail, tapering, swept out to the side
     · a cherry-blossom branch running up one side of her: five-petal
       blossoms with yellow centres, small sage leaves, and round buds

   The same builder makes both dragons — the tiny one that follows
   your cursor, and the big one on the character sheet.
   ══════════════════════════════════════════════════════════════ */

import * as THREE from "../vendor/three.module.js";

/* ── the palette, sampled off the artwork ───────────────────── */
const C = {
  scaleLow:  0xf7cfe0,   // belly-side pink
  scaleMid:  0xeecfe9,   // the body's main pink
  scaleTop:  0xdccdf2,   // lilac over the shoulders
  scaleCool: 0xd2e2f2,   // the pale blue the scales shift toward
  belly:     0xfff7f0,   // cream chest and muzzle
  mane:      0xf4d2ea,
  maneDeep:  0xe2b2d8,
  horn:      0xfbe6c6,   // cream antlers
  hornDeep:  0xe3c295,
  claw:      0xfff3e2,
  ink:       0x53326b,
  iris:      0x6f8cf0,   // the huge blue eyes
  irisDeep:  0x2e3f9e,
  petal:     0xfcc4d8,
  petalDeep: 0xf58cb4,
  pollen:    0xffd98a,   // blossom centres
  leaf:      0xa9c48d,   // the small green leaves
  bud:       0xf7aec9,
};

const std = (color, extra = {}) =>
  new THREE.MeshStandardMaterial({ color, roughness: 0.84, metalness: 0.02, flatShading: true, ...extra });

/* cel-shading: a cheap ink contour, which is what makes it read as a
   hand-drawn illustration rather than a grey plastic blob */
function outlined(geo, mat, { w = 1.06, inkColor = C.ink } = {}) {
  const g = new THREE.Group();
  const fill = new THREE.Mesh(geo, mat);
  fill.userData.isFill = true;
  const line = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: inkColor, side: THREE.BackSide }));
  line.scale.setScalar(w);
  line.renderOrder = -1;
  g.add(line, fill);
  g.userData.fill = fill;
  return g;
}

/* a tapered tube between two points — the workhorse for antlers,
   branches and stems */
const UP = new THREE.Vector3(0, 1, 0);
function strut(ax, ay, az, bx, by, bz, r0, r1, mat) {
  const d = new THREE.Vector3(bx - ax, by - ay, bz - az);
  const len = d.length() || 0.001;
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r1, r0, len, 6), mat);
  m.position.set((ax + bx) / 2, (ay + by) / 2, (az + bz) / 2);
  m.quaternion.setFromUnitVectors(UP, d.clone().normalize());
  return m;
}

const mScaleLow = std(C.scaleLow);
const mScaleMid = std(C.scaleMid);
const mScaleTop = std(C.scaleTop);
const mScaleCool = std(C.scaleCool);
const mBelly = std(C.belly);
const mMane = std(C.mane);
const mManeDeep = std(C.maneDeep);
const mHorn = std(C.horn);
const mHornDeep = std(C.hornDeep);
const mClaw = std(C.claw);
const mInk = std(C.ink);
const mPetal = std(C.petal);
const mPetalDeep = std(C.petalDeep);
const mPollen = std(C.pollen);
const mLeaf = std(C.leaf);
const mBud = std(C.bud);

/* ── ONE cherry blossom: five petals, yellow centre ─────────── */
function blossom(r = 0.09) {
  const g = new THREE.Group();

  for (let i = 0; i < 5; i++) {
    // a notch at the tip is what makes a cherry petal a cherry petal
    const p = new THREE.Mesh(new THREE.SphereGeometry(r * 0.58, 6, 5), i % 2 ? mPetalDeep : mPetal);
    const a = (i / 5) * Math.PI * 2 + Math.PI / 2;
    p.position.set(Math.cos(a) * r * 0.74, Math.sin(a) * r * 0.74, 0);
    p.scale.set(1, 1, 0.34);
    p.rotation.z = a;
    g.add(p);
  }
  // the little notch that says "sakura" and not "daisy"
  const notch = new THREE.Mesh(new THREE.SphereGeometry(r * 0.2, 5, 4), mPetalDeep);
  notch.position.set(0, r * 1.05, 0);
  notch.scale.set(1, 0.6, 0.3);
  g.add(notch);

  const centre = new THREE.Mesh(new THREE.SphereGeometry(r * 0.24, 6, 5), mPollen);
  centre.scale.z = 0.6;
  g.add(centre);
  // two stamens, not four — every one of these is a draw call
  for (let i = 0; i < 2; i++) {
    const st = new THREE.Mesh(new THREE.SphereGeometry(r * 0.08, 4, 3), mHorn);
    const a = i * Math.PI + Math.PI / 4;
    st.position.set(Math.cos(a) * r * 0.15, Math.sin(a) * r * 0.15, r * 0.12);
    g.add(st);
  }
  return g;
}

/* ── a small sage-green leaf ───────────────────────────────── */
function leaf(len = 0.09) {
  const g = new THREE.Group();
  const blade = new THREE.Mesh(new THREE.SphereGeometry(len * 0.5, 6, 4), mLeaf);
  blade.scale.set(0.62, 1.5, 0.22);
  g.add(blade);
  const stalk = new THREE.Mesh(new THREE.CylinderGeometry(len * 0.05, len * 0.05, len * 0.6, 4), mLeaf);
  stalk.position.y = -len * 0.95;
  g.add(stalk);
  return g;
}

/* ── a round unopened bud ──────────────────────────────────── */
function bud(r = 0.07) {
  const g = new THREE.Group();
  const b = new THREE.Mesh(new THREE.SphereGeometry(r, 7, 6), mBud);
  b.scale.set(0.8, 1.25, 0.8);
  g.add(b);
  const cap = new THREE.Mesh(new THREE.ConeGeometry(r * 0.55, r * 0.7, 5), mLeaf);
  cap.position.y = -r * 0.5;
  cap.rotation.x = Math.PI;
  g.add(cap);
  return g;
}

/* ── A BRANCHING ANTLER ─────────────────────────────────────
   A main beam that sweeps up and outward, with tines branching off
   it. Stag-like, wide, cream. Nothing like a candle. */
function antler(len) {
  const g = new THREE.Group();

  // the beam: base → up → out, four points
  const beam = [
    [0, 0, 0],
    [len * 0.10, len * 0.42, len * 0.02],
    [len * 0.30, len * 0.76, len * 0.04],
    [len * 0.58, len * 0.96, len * 0.02],
  ];
  for (let i = 0; i < beam.length - 1; i++) {
    const [ax, ay, az] = beam[i], [bx, by, bz] = beam[i + 1];
    const t0 = 1 - i * 0.17, t1 = 1 - (i + 1) * 0.17;
    g.add(strut(ax, ay, az, bx, by, bz, len * 0.082 * t0, len * 0.082 * t1, i % 2 ? mHornDeep : mHorn));
  }

  // tines: which beam point they spring from, which way, how long
  const tines = [
    [1, 0.42, 0.44, 0.02],    // low forward tine
    [2, 0.46, 0.24, 0.10],    // the main up-tine
    [3, 0.34, 0.10, 0.16],    // the crown
    [2, -0.16, 0.52, 0.02],   // a back tine, sweeps the other way
    [1, -0.30, 0.18, 0.06],   // low back tine
  ];
  for (const [idx, dx, dy, dz] of tines) {
    const [px, py, pz] = beam[idx];
    const L = len * 0.44;
    const ex = px + dx * L, ey = py + dy * L, ez = pz + dz * L;
    g.add(strut(px, py, pz, ex, ey, ez, len * 0.05, len * 0.016, mHorn));
    // and a small fork on the long ones, the way real antlers do
    if (dy > 0.2) {
      g.add(strut(ex, ey, ez, ex + dx * L * 0.34, ey + dy * L * 0.30, ez + dz * L * 0.34,
        len * 0.024, len * 0.008, mHornDeep));
    }
  }
  return g;
}

/* ── THE SHIMMER ──────────────────────────────────────────────
   "The scales shimmer softly in pastel hues of pink, lilac and light
   blue, with subtle iridescence."

   Rather than an expensive iridescence shader, the four scale
   materials drift a few degrees of hue on a slow sine. It costs four
   colour writes per frame and reads exactly like the artwork when
   she is small — which is most of the time. */
const _hue = { h: 0, s: 0, l: 0 };
function shimmer(t) {
  const k = Math.sin(t * 0.35);
  const set = (mat, dl, ds) => {
    mat.color.getHSL(_hue);
    mat.color.setHSL(
      (_hue.h + 0.012 * k + 1) % 1,
      THREE.MathUtils.clamp(_hue.s + ds, 0, 1),
      THREE.MathUtils.clamp(_hue.l + dl, 0, 1)
    );
  };
  set(mScaleLow, 0.012 * k, 0);
  set(mScaleMid, 0.008 * k, 0);
  set(mScaleTop, 0.016 * k, 0.02 * k);
  set(mScaleCool, -0.014 * k, 0.03 * k);
}

/* ══════════════════════════════════════════════════════════════
   buildPipo({ chibi })
   ══════════════════════════════════════════════════════════════ */
export function buildPipo({ chibi = true } = {}) {
  const P = chibi
    ? { head: 0.62, body: 0.76, eye: 0.36, tail: 0.92, leg: 0.24, neck: 0.05, horn: 0.40, detail: 0.5 }
    : { head: 0.58, body: 1.00, eye: 0.34, tail: 1.50, leg: 0.36, neck: 0.22, horn: 0.72, detail: 1 };

  const root = new THREE.Group();
  const rig = {
    root,
    wings: [],      // she is wingless. kept for the animator.
    tail: [], eyes: [], legs: [], blossoms: [], leaves: [],
    head: null, headBase: null, breath: null,
  };

  /* ══ torso ══ */
  const breath = new THREE.Group();
  rig.breath = breath;
  root.add(breath);

  const torso = outlined(new THREE.IcosahedronGeometry(P.body, 3), mScaleMid);
  torso.scale.set(1.04, 0.98, 1.06);
  torso.position.y = 0.04;
  breath.add(torso);

  // the cream chest, low and forward
  const belly = outlined(new THREE.SphereGeometry(P.body * 0.72, 18, 14), mBelly, { w: 1.025 });
  belly.scale.set(0.84, 0.92, 0.62);
  belly.position.set(0, -0.14, P.body * 0.52);
  breath.add(belly);

  /* ══ OVERLAPPING SCALLOP SCALES ══
     The artwork's defining texture: rows of little round-topped
     scales that read pink at the bottom, lilac over the shoulders
     and cool blue toward the back. Only on the chibi do we thin them
     out — at 44px nobody could tell, and they are a lot of geometry. */
  /* The chibi is 44 pixels wide. Scale texture at that size is a
     handful of grey dots — pure draw calls for nothing. The adult on
     the character sheet is where you actually read it. */
  const rows = chibi ? 4 : 12;
  const cols = chibi ? 5 : 10;
  const scaleR = P.body * 0.115;
  const mByHeight = (t) => (t < 0.34 ? mScaleLow : t < 0.68 ? mScaleMid : t < 0.86 ? mScaleTop : mScaleCool);

  for (let r = 0; r < rows; r++) {
    const ty = r / (rows - 1);                      // 0 = bottom
    const y = -P.body * 0.78 + ty * P.body * 1.58;
    // the body is an ellipsoid, so the ring shrinks toward the ends
    const ring = Math.sqrt(Math.max(0.02, 1 - Math.pow((y - 0.04) / (P.body * 1.0), 2)));
    const n = Math.max(3, Math.round(cols * ring));
    for (let c = 0; c < n; c++) {
      const a = (c / n) * Math.PI * 2 + (r % 2 ? Math.PI / n : 0);
      const rad = P.body * 0.99 * ring;
      const px = Math.sin(a) * rad * 1.04;
      const pz = Math.cos(a) * rad * 1.06;
      // never on the cream chest
      if (Math.cos(a) > 0.62 && y < P.body * 0.1) continue;

      const s = new THREE.Mesh(new THREE.SphereGeometry(scaleR, 6, 4, 0, Math.PI * 2, 0, Math.PI * 0.55), mByHeight(ty));
      s.position.set(px, y, pz);
      s.scale.set(1, 0.62, 1);
      s.lookAt(px * 2, y + (y - 0.04) * 0.12, pz * 2);
      breath.add(s);
    }
  }

  /* ══ neck + head ══ */
  const neck = new THREE.Group();
  neck.position.set(0, 0.06 + P.body * 0.66, P.body * 0.34);
  breath.add(neck);

  if (P.neck > 0.12) {
    const nm = outlined(new THREE.CylinderGeometry(P.head * 0.40, P.head * 0.56, P.neck + 0.18, 12), mScaleMid);
    nm.position.y = (P.neck + 0.18) / 2 - 0.04;
    nm.rotation.x = 0.38;
    neck.add(nm);
  }

  const head = new THREE.Group();
  head.position.y = P.neck + 0.06;
  neck.add(head);
  rig.head = head;
  rig.headBase = head.position.clone();

  const skull = outlined(new THREE.IcosahedronGeometry(P.head, 3), mScaleMid);
  skull.scale.set(1, 0.97, 0.95);
  head.add(skull);

  // cream muzzle, small and low, like the artwork
  const snout = outlined(new THREE.SphereGeometry(P.head * 0.40, 16, 12), mBelly, { w: 1.03 });
  snout.scale.set(0.92, 0.62, 0.86);
  snout.position.set(0, -P.head * 0.36, P.head * 0.70);
  head.add(snout);

  const nose = new THREE.Mesh(new THREE.SphereGeometry(P.head * 0.055, 8, 6), mInk);
  nose.position.set(0, -P.head * 0.30, P.head * 1.02);
  nose.scale.set(1.3, 0.8, 0.7);
  head.add(nose);

  // the small soft smile
  const smile = new THREE.Mesh(
    new THREE.TorusGeometry(P.head * 0.17, P.head * 0.028, 6, 16, Math.PI * 0.7),
    mInk
  );
  smile.position.set(0, -P.head * 0.47, P.head * 0.90);
  smile.rotation.set(Math.PI / 2, 0, Math.PI * 0.15);
  head.add(smile);

  /* ══ THE MANE ══
     A halo of overlapping soft blobs behind and around the skull,
     swept to one side the way the artwork does. She is mostly mane. */
  const mane = new THREE.Group();
  mane.position.z = -P.head * 0.2;
  head.add(mane);

  const maneRing = [
    [-0.22, 1.00, 0.50, mManeDeep], [0.30, 1.06, 0.54, mMane],
    [0.86, 1.02, 0.48, mManeDeep], [1.42, 0.98, 0.50, mMane],
    [1.98, 1.00, 0.52, mManeDeep], [2.52, 1.02, 0.48, mMane],
    [3.08, 1.00, 0.54, mManeDeep], [3.66, 0.96, 0.46, mMane],
    [0.58, 1.24, 0.42, mMane], [2.40, 1.26, 0.40, mManeDeep],
    [-0.78, 1.18, 0.44, mManeDeep], [1.84, 1.20, 0.38, mMane],
  ];
  maneRing.forEach(([a, rad, sz, mat]) => {
    // push the right-hand side further out: the swept swoosh
    const sweep = Math.max(0, Math.cos(a)) * 0.26;
    const b = outlined(new THREE.IcosahedronGeometry(P.head * sz, 1), mat, { w: 1.05, inkColor: C.maneDeep });
    b.position.set(Math.cos(a) * P.head * (rad + sweep), Math.sin(a) * P.head * rad * 1.08, -P.head * (0.16 + sweep * 0.3));
    b.scale.set(1, 0.9, 0.7);
    mane.add(b);
  });

  // strands standing up and off to the side
  for (let i = 0; i < 6; i++) {
    const t = (i - 2.5) / 2.5;
    const sp = outlined(new THREE.ConeGeometry(P.head * 0.19, P.head * 0.66, 5), i % 2 ? mMane : mManeDeep, { w: 1.05, inkColor: C.maneDeep });
    sp.position.set(t * P.head * 0.62 + P.head * 0.1, P.head * (1.02 - Math.abs(t) * 0.18), -P.head * 0.16);
    sp.rotation.z = -t * 0.85;
    mane.add(sp);
  }

  /* ══ ANTLERS ══ cream, wide, stag-like */
  for (const side of [-1, 1]) {
    const a = antler(P.horn);
    a.position.set(side * P.head * 0.36, P.head * 0.72, -P.head * 0.12);
    a.rotation.set(-0.22, 0, side * 0.62);
    if (side === -1) a.scale.x = -1;
    head.add(a);
  }

  /* ══ THE HUGE EYES ══ */
  for (const side of [-1, 1]) {
    const eg = new THREE.Group();
    eg.position.set(side * P.head * 0.40, P.head * 0.06, P.head * 0.62);

    const white = new THREE.Mesh(new THREE.SphereGeometry(P.eye, 20, 16), std(0xfdfbff, { roughness: 0.22 }));
    white.scale.set(1, 1.1, 0.6);
    eg.add(white);

    // the iris: a big blue dome with a darker rim, set into the white
    const iris = new THREE.Mesh(new THREE.SphereGeometry(P.eye * 0.76, 18, 14), std(C.iris, { roughness: 0.15, metalness: 0.04 }));
    iris.position.set(0, 0, P.eye * 0.30);
    iris.scale.z = 0.8;
    eg.add(iris);

    // the darker outer ring the artwork has
    const rim = new THREE.Mesh(new THREE.TorusGeometry(P.eye * 0.76, P.eye * 0.085, 6, 20), new THREE.MeshBasicMaterial({ color: C.irisDeep }));
    rim.position.set(0, 0, P.eye * 0.40);
    eg.add(rim);

    const pup = new THREE.Mesh(new THREE.SphereGeometry(P.eye * 0.34, 16, 12), new THREE.MeshBasicMaterial({ color: C.irisDeep }));
    pup.position.set(0, 0, P.eye * 0.58);
    pup.scale.z = 0.55;
    eg.add(pup);

    // two round highlights
    const hi1 = new THREE.Mesh(new THREE.SphereGeometry(P.eye * 0.24, 10, 8), new THREE.MeshBasicMaterial({ color: 0xffffff }));
    hi1.position.set(side * P.eye * 0.28, P.eye * 0.32, P.eye * 0.70);
    eg.add(hi1);
    const hi2 = new THREE.Mesh(new THREE.SphereGeometry(P.eye * 0.10, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffffff }));
    hi2.position.set(side * P.eye * 0.34, -P.eye * 0.28, P.eye * 0.68);
    eg.add(hi2);

    // the tiny star sparkle in the iris — the "made with love" detail
    const spark = new THREE.Mesh(new THREE.OctahedronGeometry(P.eye * 0.13, 0), new THREE.MeshBasicMaterial({ color: 0xffffff }));
    spark.position.set(-side * P.eye * 0.34, -P.eye * 0.06, P.eye * 0.62);
    spark.rotation.z = 0.6;
    eg.add(spark);

    // blush
    const bl = new THREE.Mesh(new THREE.CircleGeometry(P.eye * 0.38, 12), new THREE.MeshBasicMaterial({ color: C.petalDeep, transparent: true, opacity: 0.38 }));
    bl.position.set(side * P.eye * 0.66, -P.eye * 0.36, P.eye * 0.26);
    bl.rotation.y = side * 0.55;
    eg.add(bl);

    head.add(eg);
    rig.eyes.push(eg);
  }

  /* ══ STUBBY LEGS WITH CLAWS ══ */
  for (const [sx, sz] of [[-1, 1], [1, 1], [-1, -1], [1, -1]]) {
    const leg = new THREE.Group();
    leg.position.set(sx * P.body * 0.44, -P.body * 0.62, sz * P.body * 0.40);

    const shin = outlined(new THREE.CapsuleGeometry(P.leg * 0.44, P.leg * 0.34, 4, 10), mScaleMid);
    shin.position.y = -P.leg * 0.28;
    leg.add(shin);

    // three little cream claws
    for (let c = -1; c <= 1; c++) {
      const claw = new THREE.Mesh(new THREE.ConeGeometry(P.leg * 0.13, P.leg * 0.34, 5), mClaw);
      claw.position.set(c * P.leg * 0.22, -P.leg * 0.66, P.leg * 0.16);
      claw.rotation.x = Math.PI * 0.62;
      leg.add(claw);
    }
    breath.add(leg);
    rig.legs.push(leg);
  }

  /* ══ TAIL: fluffy, curled, tapering, swept to the side ══ */
  const tailRoot = new THREE.Group();
  tailRoot.position.set(P.body * 0.18, -P.body * 0.1, -P.body * 0.86);
  breath.add(tailRoot);

  const N = 10;
  let parent = tailRoot;
  for (let i = 0; i < N; i++) {
    const seg = new THREE.Group();
    seg.position.z = i === 0 ? 0 : -(P.tail / N) * 1.2;
    // a gentle sideways curl, the way it lies in the artwork
    seg.position.x = i === 0 ? 0 : P.body * 0.055;
    const r = P.body * 0.44 * (1 - Math.pow(i / (N + 1.6), 1.35));
    const m = outlined(new THREE.IcosahedronGeometry(Math.max(r, 0.015), 1), i % 2 ? mScaleMid : mScaleTop, { w: 1.04 });
    m.scale.set(1.06, 0.92, 1.14);
    seg.add(m);
    parent.add(seg);
    rig.tail.push(seg);
    parent = seg;
  }
  const tip = outlined(new THREE.ConeGeometry(P.body * 0.14, P.body * 0.46, 5), mScaleCool, { w: 1.07 });
  tip.rotation.x = Math.PI / 2;
  tip.position.z = -(P.tail / N) * 1.2;
  parent.add(tip);

  /* ══ THE BLOSSOM BRANCH ══
     A stem running up one side of her with open blossoms, small
     sage leaves and round buds. It is the most recognisable thing
     about the artwork, so it gets built properly. */
  const branch = new THREE.Group();
  branch.position.set(-P.body * 0.92, -P.body * 0.30, P.body * 0.18);
  breath.add(branch);

  const STEM = [
    [0, 0, 0],
    [-P.body * 0.10, P.body * 0.42, P.body * 0.06],
    [-P.body * 0.04, P.body * 0.86, -P.body * 0.02],
    [P.body * 0.12, P.body * 1.24, -P.body * 0.10],
  ];
  for (let i = 0; i < STEM.length - 1; i++) {
    const [ax, ay, az] = STEM[i], [bx, by, bz] = STEM[i + 1];
    branch.add(strut(ax, ay, az, bx, by, bz, P.body * 0.038 * (1 - i * 0.16), P.body * 0.038 * (1 - (i + 1) * 0.16), mLeaf));
  }

  // blossoms, leaves and buds hung along the stem
  const DRESS = [
    [0, 0.10, 0.00, 0.16, "b", -0.3], [1, 0.46, 0.10, 0.13, "b", 0.4],
    [1, 0.58, -0.12, 0.14, "l", 2.2], [2, 0.92, 0.02, 0.15, "b", -0.2],
    [2, 1.02, -0.16, 0.10, "l", 2.6], [2, 0.80, 0.16, 0.09, "u", 0.0],
    [3, 1.26, -0.02, 0.14, "b", 0.3], [3, 1.34, 0.14, 0.10, "l", -0.6],
    [3, 1.14, 0.10, 0.08, "u", 0.0], [0, 0.02, 0.14, 0.10, "l", -1.1],
  ];
  for (const [si, t, off, size, kind, rot] of DRESS) {
    const base = STEM[Math.min(si, STEM.length - 1)];
    const nxt = STEM[Math.min(si + 1, STEM.length - 1)];
    const x = base[0] + (nxt[0] - base[0]) * (t % 1);
    const y = base[1] + (nxt[1] - base[1]) * (t % 1);
    const z = base[2] + (nxt[2] - base[2]) * (t % 1);
    const r = P.body * size;

    let node;
    if (kind === "b") node = blossom(r);
    else if (kind === "l") node = leaf(r * 1.15);
    else node = bud(r * 0.9);

    node.position.set(x - off * P.body * 0.3, y, z + off * P.body * 0.5);
    node.rotation.set(rot * 0.3, rot, rot * 0.6);
    branch.add(node);

    if (kind === "b") rig.blossoms.push(node);
    if (kind === "l") rig.leaves.push(node);
  }

  /* ══ a couple of loose blossoms on the tail, like the art ══ */
  [3, 6].forEach((idx, k) => {
    const seg = rig.tail[idx];
    if (!seg) return;
    const b = blossom(P.body * 0.15);
    b.position.set((k % 2 ? 1 : -1) * P.body * 0.3, P.body * 0.18, 0);
    b.rotation.z = k * 1.2;
    seg.add(b);
    rig.blossoms.push(b);
    const lf = leaf(P.body * 0.16);
    lf.position.set((k % 2 ? -1 : 1) * P.body * 0.26, -P.body * 0.14, 0);
    seg.add(lf);
    rig.leaves.push(lf);
  });

  /* ══════════════════════════ ANIMATION ══════════════════════
     Wingless, so the flight is all body roll, tail whip and a
     tucked-leg drift. She floats; she does not flap. */
  const blinkAt = () => 1.7 + Math.random() * 5.0;
  let nextBlink = blinkAt();
  let blink = 0;

  root.userData.update = (dt, t, state = {}) => {
    const speed = state.speed ?? 1;
    const flying = state.flying ?? false;

    shimmer(t);   // shared materials, so it is idempotent across both dragons

    // breathing
    const br = 1 + Math.sin(t * 2.1) * 0.026;
    breath.scale.set(br, 1 / br, br);

    // a gentle float when she's following you
    breath.position.y = flying ? Math.sin(t * 2.6) * 0.05 : 0;
    breath.rotation.z = flying ? Math.sin(t * 1.7) * 0.10 : 0;
    breath.rotation.x = flying ? -0.12 + Math.sin(t * 2.2) * 0.05 : 0;

    if (rig.head) {
      rig.head.rotation.y += ((state.lookY ?? 0) - rig.head.rotation.y) * Math.min(1, dt * 6);
      rig.head.rotation.x += ((state.lookX ?? 0.08) - rig.head.rotation.x) * Math.min(1, dt * 6);
      rig.head.position.y = rig.headBase.y + Math.sin(t * 2.4) * 0.018;
    }

    // blink
    nextBlink -= dt;
    if (nextBlink <= 0) { blink = 0.17; nextBlink = blinkAt(); }
    if (blink > 0) {
      blink -= dt;
      const k = blink > 0.085 ? blink / 0.17 : blink / 0.085;
      const s = 0.08 + Math.abs(Math.sin(k * Math.PI * 2)) * 0.92;
      rig.eyes.forEach((e) => e.scale.set(1, s, 1));
    }

    // the tail: a travelling wave, faster when she is moving
    rig.tail.forEach((seg, i) => {
      const ph = t * (flying ? 7.2 : 3.0) - i * 0.62;
      seg.rotation.y = Math.sin(ph) * (0.13 + i * 0.018);
      seg.rotation.x = Math.cos(ph * 0.6) * 0.05;
    });

    rig.blossoms.forEach((b, i) => { b.rotation.z += dt * (0.35 + i * 0.18); });
    rig.leaves.forEach((l, i) => { l.rotation.z = Math.sin(t * 1.4 + i) * 0.22; });

    // legs drift back and tuck when she's flying
    rig.legs.forEach((l, i) => {
      l.rotation.x = flying ? -0.7 + i * 0.06 : Math.sin(t * 2.1 + i) * 0.06;
      l.position.y = (flying ? 0.04 : 0) + Math.sin(t * 2.1 + i * 0.8) * 0.012;
    });
  };

  root.userData.rig = rig;
  return root;
}
