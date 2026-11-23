import * as THREE from 'three';
import { BASE_COLORS } from '../data/coats';
import { RatAppearance } from '../types/game';

const textureCache = new Map<string, { map: THREE.CanvasTexture; bumpMap: THREE.CanvasTexture }>();

function appearanceKey(app: RatAppearance): string {
  return `${app.baseColor}|${app.markingColor}|${app.pattern}|${app.headCap ? 1 : 0}|${app.coatTexture}`;
}

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace('#', '');
  const n = parseInt(clean, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function shiftColor(hex: string, delta: number): string {
  const [r, g, b] = hexToRgb(hex);
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
  return `rgb(${clamp(r + delta)},${clamp(g + delta)},${clamp(b + delta)})`;
}

// Deterministic pseudo-random so each coat pattern looks consistent and natural
function mulberry32(seed: number) {
  let a = seed;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Generates a realistic soft-fur CanvasTexture for rat body UV mapping:
 * UV convention on our rat torso Lathe/Sphere:
 * - U (0..1): wraps around body circumference; U=0.5 is top center of spine/back, U=0.0 & 1.0 is belly!
 * - V (0..1): runs from rump/tail base (V=0) to shoulders/neck (V=1).
 */
export function getFurTextures(app: RatAppearance): {
  map: THREE.CanvasTexture;
  bumpMap: THREE.CanvasTexture;
} {
  const key = appearanceKey(app);
  const cached = textureCache.get(key);
  if (cached) return cached;

  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  const baseInfo = BASE_COLORS[app.baseColor];
  const markInfo = BASE_COLORS[app.markingColor];

  // 1. Fill base coat
  ctx.fillStyle = baseInfo.hex;
  ctx.fillRect(0, 0, size, size);

  // 2. Subtle lighter belly gradient (around U=0 and U=1 edges)
  const drawBellyBand = (colorHex: string, widthPx: number, alpha: number) => {
    ctx.save();
    ctx.globalAlpha = alpha;
    const gL = ctx.createLinearGradient(0, 0, widthPx, 0);
    gL.addColorStop(0, colorHex);
    gL.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = gL;
    ctx.fillRect(0, 0, widthPx, size);

    const gR = ctx.createLinearGradient(size, 0, size - widthPx, 0);
    gR.addColorStop(0, colorHex);
    gR.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = gR;
    ctx.fillRect(size - widthPx, 0, widthPx, size);
    ctx.restore();
  };

  drawBellyBand(baseInfo.bellyHex, size * 0.24, 0.72);

  // 3. Apply marking patterns
  const rand = mulberry32(
    key.split('').reduce((acc, ch) => acc * 31 + ch.charCodeAt(0), 1337)
  );

  if (app.pattern === 'dorsal_stripe') {
    // Neat soft-edged longitudinal stripe along the spine (center U=0.5) from shoulders to tail base
    const stripeW = size * 0.17;
    const cx = size * 0.5;
    const grad = ctx.createLinearGradient(cx - stripeW, 0, cx + stripeW, 0);
    grad.addColorStop(0, 'rgba(0,0,0,0)');
    grad.addColorStop(0.22, markInfo.hex);
    grad.addColorStop(0.5, shiftColor(markInfo.hex, -8));
    grad.addColorStop(0.78, markInfo.hex);
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(cx - stripeW, size * 0.04, stripeW * 2, size * 0.92);
  } else if (app.pattern === 'hooded_stripe') {
    // Dark shoulders/hood at top (high V -> low Y in canvas) + neat dorsal stripe
    const hoodGrad = ctx.createLinearGradient(0, 0, 0, size * 0.36);
    hoodGrad.addColorStop(0, markInfo.hex);
    hoodGrad.addColorStop(0.72, markInfo.hex);
    hoodGrad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = hoodGrad;
    ctx.fillRect(0, 0, size, size * 0.36);

    const stripeW = size * 0.16;
    const cx = size * 0.5;
    const sGrad = ctx.createLinearGradient(cx - stripeW, 0, cx + stripeW, 0);
    sGrad.addColorStop(0, 'rgba(0,0,0,0)');
    sGrad.addColorStop(0.25, markInfo.hex);
    sGrad.addColorStop(0.75, markInfo.hex);
    sGrad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = sGrad;
    ctx.fillRect(cx - stripeW, size * 0.18, stripeW * 2, size * 0.78);
  } else if (app.pattern === 'capped') {
    // Only slight collar tint near neck; head mesh carries the cap color
    const g = ctx.createLinearGradient(0, 0, 0, size * 0.16);
    g.addColorStop(0, markInfo.hex);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size * 0.16);
  } else if (app.pattern === 'berkshire') {
    // Solid upper coat with crisp cozy white belly
    drawBellyBand('#F7F5F0', size * 0.27, 0.96);
  } else if (app.pattern === 'patched') {
    // Soft large organic patches
    const patches = [
      { x: 0.38, y: 0.34, rx: 0.16, ry: 0.18 },
      { x: 0.64, y: 0.52, rx: 0.17, ry: 0.19 },
      { x: 0.44, y: 0.74, rx: 0.14, ry: 0.14 },
      { x: 0.56, y: 0.18, rx: 0.15, ry: 0.13 },
    ];
    ctx.save();
    ctx.filter = 'blur(6px)';
    ctx.fillStyle = markInfo.hex;
    for (const p of patches) {
      ctx.beginPath();
      ctx.ellipse(p.x * size, p.y * size, p.rx * size, p.ry * size, (rand() - 0.5) * 0.8, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  } else if (app.pattern === 'spotted') {
    // Cute scattered small spots
    ctx.save();
    ctx.filter = 'blur(3px)';
    ctx.fillStyle = markInfo.hex;
    for (let i = 0; i < 20; i++) {
      const sx = (0.18 + rand() * 0.64) * size;
      const sy = (0.1 + rand() * 0.8) * size;
      const sr = (0.025 + rand() * 0.038) * size;
      ctx.beginPath();
      ctx.ellipse(sx, sy, sr, sr * (0.8 + rand() * 0.4), rand() * Math.PI, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  } else if (app.pattern === 'siamese' || app.pattern === 'himalayan') {
    // Soft darkened rump point near tail base (bottom of texture)
    const intensity = app.pattern === 'siamese' ? 0.72 : 0.45;
    const rumpGrad = ctx.createLinearGradient(0, size, 0, size * 0.72);
    rumpGrad.addColorStop(0, markInfo.hex);
    rumpGrad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.save();
    ctx.globalAlpha = intensity;
    ctx.fillStyle = rumpGrad;
    ctx.fillRect(0, size * 0.72, size, size * 0.28);
    ctx.restore();
  }

  // 4. Fine fur hair-stroke grain overlay (makes the 3D rat look fluffy & velvety, NOT plastic!)
  const strokeCount = app.baseColor === 'agouti' ? 7500 : 5200;
  ctx.lineWidth = app.coatTexture === 'rex' ? 2.1 : 1.3;
  for (let i = 0; i < strokeCount; i++) {
    const x = rand() * size;
    const y = rand() * size;
    const len = app.coatTexture === 'rex' ? 8 + rand() * 7 : 9 + rand() * 10;
    const light = rand() > 0.48;

    if (app.baseColor === 'agouti') {
      ctx.strokeStyle = rand() > 0.55 ? 'rgba(42,32,20,0.22)' : 'rgba(196,162,112,0.24)';
    } else if (app.baseColor === 'silver') {
      ctx.strokeStyle = rand() > 0.65 ? 'rgba(248,250,255,0.38)' : 'rgba(65,70,76,0.16)';
    } else {
      ctx.strokeStyle = light ? 'rgba(255,255,255,0.11)' : 'rgba(20,18,16,0.10)';
    }

    ctx.beginPath();
    ctx.moveTo(x, y);
    if (app.coatTexture === 'rex') {
      const wave = (rand() - 0.5) * 5;
      ctx.quadraticCurveTo(x + wave, y + len * 0.5, x - wave * 0.6, y + len);
    } else {
      ctx.lineTo(x + (rand() - 0.5) * 2.2, y + len);
    }
    ctx.stroke();
  }

  // 5. Generate matching Bump Map (soft directional fur micro-relief; stronger wavy curls for Rex)
  const bumpCanvas = document.createElement('canvas');
  bumpCanvas.width = 256;
  bumpCanvas.height = 256;
  const bCtx = bumpCanvas.getContext('2d')!;
  bCtx.fillStyle = '#808080';
  bCtx.fillRect(0, 0, 256, 256);

  const bRand = mulberry32(app.coatTexture === 'rex' ? 999 : 444);
  if (app.coatTexture === 'rex') {
    for (let i = 0; i < 2400; i++) {
      const x = bRand() * 256;
      const y = bRand() * 256;
      bCtx.strokeStyle = bRand() > 0.5 ? 'rgba(235,235,235,0.45)' : 'rgba(40,40,40,0.45)';
      bCtx.lineWidth = 2.0;
      bCtx.beginPath();
      bCtx.arc(x, y, 2.8 + bRand() * 2.5, 0, Math.PI * 1.3);
      bCtx.stroke();
    }
  } else {
    for (let i = 0; i < 2600; i++) {
      const x = bRand() * 256;
      const y = bRand() * 256;
      bCtx.strokeStyle = bRand() > 0.5 ? 'rgba(200,200,200,0.28)' : 'rgba(65,65,65,0.28)';
      bCtx.lineWidth = 1.0;
      bCtx.beginPath();
      bCtx.moveTo(x, y);
      bCtx.lineTo(x + (bRand() - 0.5) * 1.5, y + 6 + bRand() * 6);
      bCtx.stroke();
    }
  }

  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  map.wrapS = THREE.RepeatWrapping;
  map.wrapT = THREE.ClampToEdgeWrapping;
  map.needsUpdate = true;

  const bumpMap = new THREE.CanvasTexture(bumpCanvas);
  bumpMap.wrapS = THREE.RepeatWrapping;
  bumpMap.wrapT = THREE.RepeatWrapping;
  bumpMap.needsUpdate = true;

  const res = { map, bumpMap };
  textureCache.set(key, res);
  return res;
}

/**
 * Resolve head & ear fur colors based on coat preset / pattern (e.g. white head vs gray cap, hooded, siamese point)
 */
export function getHeadColors(app: RatAppearance): {
  headHex: string;
  snoutHex: string;
  earOuterHex: string;
  pawHex: string;
} {
  const base = BASE_COLORS[app.baseColor];
  const mark = BASE_COLORS[app.markingColor];
  const pinkPaw = '#EAB8B5';

  if (app.pattern === 'dorsal_stripe') {
    const headHex = app.headCap ? mark.hex : base.hex;
    return {
      headHex,
      snoutHex: base.hex,
      earOuterHex: app.headCap ? mark.hex : '#ECC5C1',
      pawHex: pinkPaw,
    };
  }
  if (app.pattern === 'hooded_stripe' || app.pattern === 'capped') {
    return {
      headHex: mark.hex,
      snoutHex: mark.hex,
      earOuterHex: mark.hex,
      pawHex: pinkPaw,
    };
  }
  if (app.pattern === 'siamese') {
    return {
      headHex: base.hex,
      snoutHex: mark.hex,
      earOuterHex: mark.hex,
      pawHex: '#A78474',
    };
  }
  if (app.pattern === 'himalayan') {
    return {
      headHex: base.hex,
      snoutHex: shiftColor(mark.hex, 35),
      earOuterHex: shiftColor(mark.hex, 30),
      pawHex: '#CFA89C',
    };
  }
  if (app.pattern === 'berkshire') {
    return {
      headHex: base.hex,
      snoutHex: base.hex,
      earOuterHex: base.hex,
      pawHex: '#F5EFEA',
    };
  }
  return {
    headHex: base.hex,
    snoutHex: base.hex,
    earOuterHex: app.baseColor === 'white' ? '#ECC5C1' : base.hex,
    pawHex: pinkPaw,
  };
}
