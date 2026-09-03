import * as THREE from 'three';

/**
 * COSMOS Procedural Texture Generator
 * High-quality Perlin noise-based surface textures for all planets, moons, and rings.
 * All CanvasTexture outputs are configured with SRGBColorSpace for correct PBR rendering.
 */

class PerlinNoise {
  constructor() {
    this.p = new Uint8Array(512);
    const perm = [
      151,160,137,91,90,15,131,13,201,95,96,53,194,233,7,225,140,36,103,30,69,142,8,99,37,240,
      21,10,23,190,6,148,247,120,234,75,0,26,197,62,94,252,219,203,117,35,11,32,57,177,33,88,
      237,149,56,87,174,20,125,136,171,168,68,175,74,165,71,134,139,48,27,166,77,146,158,231,
      83,111,229,122,60,211,133,230,220,105,92,41,55,46,245,40,244,102,143,54,65,25,63,161,1,
      216,80,73,209,76,132,187,208,89,18,169,200,196,135,130,116,188,159,86,164,100,109,198,
      173,186,3,64,52,217,226,250,124,123,5,202,38,147,118,126,255,82,85,212,207,206,59,227,
      47,16,58,17,182,189,28,42,223,183,170,213,119,248,152,2,44,154,163,70,221,153,101,155,
      167,43,172,9,129,22,39,253,19,98,108,110,79,113,224,232,178,185,112,104,218,246,97,228,
      251,34,242,193,238,210,144,12,191,179,162,241,81,51,145,235,249,14,239,107,49,192,214,
      31,181,199,106,157,184,84,204,176,115,121,50,45,127,4,150,254,138,236,205,93,222,114,
      67,29,24,72,243,141,128,195,78,66,215,61,156,180
    ];
    for (let i = 0; i < 256; i++) {
      this.p[i] = perm[i];
      this.p[256 + i] = perm[i];
    }
  }

  fade(t) { return t * t * t * (t * (t * 6 - 15) + 10); }
  lerp(t, a, b) { return a + t * (b - a); }
  grad(hash, x, y, z) {
    const h = hash & 15;
    const u = h < 8 ? x : y;
    const v = h < 4 ? y : h === 12 || h === 14 ? x : z;
    return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
  }

  noise(x, y, z = 0) {
    const X = Math.floor(x) & 255, Y = Math.floor(y) & 255, Z = Math.floor(z) & 255;
    x -= Math.floor(x); y -= Math.floor(y); z -= Math.floor(z);
    const u = this.fade(x), v = this.fade(y), w = this.fade(z);
    const A  = this.p[X] + Y,     AA = this.p[A] + Z,     AB = this.p[A + 1] + Z;
    const B  = this.p[X + 1] + Y, BA = this.p[B] + Z,     BB = this.p[B + 1] + Z;
    return this.lerp(w,
      this.lerp(v,
        this.lerp(u, this.grad(this.p[AA], x, y, z),     this.grad(this.p[BA], x-1, y, z)),
        this.lerp(u, this.grad(this.p[AB], x, y-1, z),   this.grad(this.p[BB], x-1, y-1, z))
      ),
      this.lerp(v,
        this.lerp(u, this.grad(this.p[AA+1], x, y, z-1), this.grad(this.p[BA+1], x-1, y, z-1)),
        this.lerp(u, this.grad(this.p[AB+1], x, y-1, z-1), this.grad(this.p[BB+1], x-1, y-1, z-1))
      )
    );
  }

  fBm(x, y, z, octaves = 6, persistence = 0.5) {
    let total = 0, freq = 1, amp = 1, maxVal = 0;
    for (let i = 0; i < octaves; i++) {
      total += this.noise(x * freq, y * freq, z * freq) * amp;
      maxVal += amp;
      amp *= persistence;
      freq *= 2;
    }
    return (total / maxVal + 1) / 2;
  }
}

const perlin = new PerlinNoise();

function clamp(v, lo = 0, hi = 255) { return Math.min(hi, Math.max(lo, Math.round(v))); }

export class TextureGenerator {
  static createCanvas(width = 2048, height = 1024) {
    const canvas = document.createElement('canvas');
    canvas.width = width; canvas.height = height;
    return { canvas, ctx: canvas.getContext('2d'), width, height };
  }

  /** Applies shared quality settings to any CanvasTexture */
  static _finalize(canvas) {
    const tex = new THREE.CanvasTexture(canvas);
    // sRGB color space — required for correct PBR albedo colour rendering
    if (THREE.SRGBColorSpace !== undefined) {
      tex.colorSpace = THREE.SRGBColorSpace;
    } else if (THREE.sRGBEncoding !== undefined) {
      tex.encoding = THREE.sRGBEncoding;
    }
    tex.anisotropy = 16;
    tex.minFilter = THREE.LinearMipmapLinearFilter;
    tex.magFilter = THREE.LinearFilter;
    tex.generateMipmaps = true;
    tex.wrapS = THREE.ClampToEdgeWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;
    return tex;
  }

  /** Converts UV coords to a unit sphere 3D point (seamless spherical noise) */
  static uvTo3D(u, v) {
    const theta = u * Math.PI * 2;
    const phi   = (v - 0.5) * Math.PI;
    return {
      x: Math.cos(phi) * Math.cos(theta),
      y: Math.sin(phi),
      z: Math.cos(phi) * Math.sin(theta)
    };
  }

  // ============================================================
  // SUN
  // ============================================================
  static generateSunTexture() {
    const W = 2048, H = 1024;
    const { canvas, ctx } = this.createCanvas(W, H);
    const img = ctx.createImageData(W, H); const d = img.data;
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const p = this.uvTo3D(x / W, y / H);
        const n1 = perlin.fBm(p.x * 12, p.y * 12, p.z * 12, 6, 0.55);
        const n2 = perlin.fBm(p.x * 28, p.y * 28, p.z * 28, 4, 0.5);
        const val = n1 * 0.7 + n2 * 0.3;
        const spot = perlin.fBm(p.x * 4 + 10, p.y * 4 + 10, p.z * 4 + 10, 4, 0.5);
        const sm   = spot < 0.28 ? Math.pow((0.28 - spot) / 0.28, 1.5) : 0;
        let r = clamp(255 * Math.min(1, val * 1.3));
        let g = clamp(220 * Math.pow(val, 1.4));
        let b = clamp(60  * Math.pow(val, 2.5));
        if (sm > 0) { r = clamp(r * (1 - sm * 0.85)); g = clamp(g * (1 - sm * 0.95)); b = clamp(b * (1 - sm * 0.98)); }
        const i = (y * W + x) * 4;
        d[i] = r; d[i+1] = g; d[i+2] = b; d[i+3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
    return this._finalize(canvas);
  }

  // ============================================================
  // MERCURY — cratered grey rock
  // ============================================================
  static generateMercuryTexture() {
    const W = 1024, H = 512;
    const { canvas, ctx } = this.createCanvas(W, H);
    const img = ctx.createImageData(W, H); const d = img.data;
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const p = this.uvTo3D(x / W, y / H);
        const macro = perlin.fBm(p.x * 3,  p.y * 3,  p.z * 3,  4, 0.5);
        const micro = perlin.fBm(p.x * 25, p.y * 25, p.z * 25, 6, 0.5);
        const val   = macro * 0.4 + micro * 0.6;
        const shade = clamp(80 + val * 120);
        const i = (y * W + x) * 4;
        d[i] = shade; d[i+1] = clamp(shade * 0.97); d[i+2] = clamp(shade * 0.93); d[i+3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
    return this._finalize(canvas);
  }

  // ============================================================
  // VENUS — thick sulphuric atmosphere, horizontal streaks
  // ============================================================
  static generateVenusTexture() {
    const W = 1024, H = 512;
    const { canvas, ctx } = this.createCanvas(W, H);
    const img = ctx.createImageData(W, H); const d = img.data;
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const u = x / W, v = y / H;
        const p = this.uvTo3D(u, v);
        // Horizontal streaks via latitude-scaled noise
        const n = perlin.fBm(p.x * 6 + u * 4, p.y * 14, p.z * 6, 5, 0.5);
        const val = n * 0.8 + 0.2;
        const i = (y * W + x) * 4;
        d[i]   = clamp(205 + val * 50);
        d[i+1] = clamp(160 + val * 60);
        d[i+2] = clamp(90  + val * 45);
        d[i+3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
    return this._finalize(canvas);
  }

  // ============================================================
  // EARTH — real world map image, procedural fallback
  // ============================================================
  static generateEarthTexture() {
    const loader = new THREE.TextureLoader();
    const tex = loader.load(
      '/assets/textures/earth.jpg',
      (t) => {
        if (THREE.SRGBColorSpace !== undefined) t.colorSpace = THREE.SRGBColorSpace;
        else if (THREE.sRGBEncoding !== undefined) t.encoding = THREE.sRGBEncoding;
        t.anisotropy = 16;
        t.needsUpdate = true;
      },
      undefined,
      () => { /* Image failed — canvas fallback applied at construction */ }
    );
    // Apply settings immediately so material renders something before async load completes
    if (THREE.SRGBColorSpace !== undefined) tex.colorSpace = THREE.SRGBColorSpace;
    tex.wrapS = THREE.ClampToEdgeWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;
    tex.anisotropy = 16;
    return tex;
  }

  static generateEarthNightTexture() {
    // Dark city-lights placeholder
    const W = 512, H = 256;
    const { canvas, ctx } = this.createCanvas(W, H);
    ctx.fillStyle = '#01030a';
    ctx.fillRect(0, 0, W, H);
    // Scatter warm city-light points
    const img = ctx.createImageData(W, H); const d = img.data;
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const p = this.uvTo3D(x / W, y / H);
        const n = perlin.fBm(p.x * 18 + 50, p.y * 18 + 50, p.z * 18 + 50, 4, 0.5);
        const lit = n > 0.72 ? Math.pow((n - 0.72) / 0.28, 2.0) : 0;
        const i = (y * W + x) * 4;
        d[i]   = clamp(lit * 255);
        d[i+1] = clamp(lit * 210);
        d[i+2] = clamp(lit * 110);
        d[i+3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
    return this._finalize(canvas);
  }

  static generateEarthCloudTexture() {
    const W = 2048, H = 1024;
    const { canvas, ctx } = this.createCanvas(W, H);
    const img = ctx.createImageData(W, H); const d = img.data;
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const p = this.uvTo3D(x / W, y / H);
        const c1 = perlin.fBm(p.x * 3.5, p.y * 3.5, p.z * 3.5, 6, 0.52);
        const c2 = perlin.fBm(p.x * 7,   p.y * 7,   p.z * 7,   4, 0.48);
        const cloud = c1 * 0.65 + c2 * 0.35;
        const alpha = cloud > 0.48 ? Math.pow((cloud - 0.48) / 0.52, 1.4) * 220 : 0;
        const i = (y * W + x) * 4;
        d[i] = 255; d[i+1] = 255; d[i+2] = 255; d[i+3] = Math.floor(alpha);
      }
    }
    ctx.putImageData(img, 0, 0);
    const tex = new THREE.CanvasTexture(canvas);
    tex.anisotropy = 16;
    tex.wrapS = THREE.ClampToEdgeWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;
    return tex; // Alpha-channel cloud — no sRGB on transparency mask
  }

  // ============================================================
  // MARS — rusty iron oxide desert, polar caps
  // ============================================================
  static generateMarsTexture() {
    const W = 1024, H = 512;
    const { canvas, ctx } = this.createCanvas(W, H);
    const img = ctx.createImageData(W, H); const d = img.data;
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const p = this.uvTo3D(x / W, y / H);
        const absLat = Math.abs((y / H - 0.5) * Math.PI);
        const n1 = perlin.fBm(p.x * 4,  p.y * 4,  p.z * 4,  5, 0.5);
        const n2 = perlin.fBm(p.x * 12, p.y * 12, p.z * 12, 4, 0.48);
        const val = n1 * 0.6 + n2 * 0.4;
        let r = clamp(150 + val * 70);
        let g = clamp(55  + val * 40);
        let b = clamp(20  + val * 25);
        // Polar ice caps
        if (absLat > 1.25) {
          const ice = Math.min(1, (absLat - 1.25) / 0.32);
          r = clamp(r + ice * (245 - r)); g = clamp(g + ice * (248 - g)); b = clamp(b + ice * (255 - b));
        }
        const i = (y * W + x) * 4;
        d[i] = r; d[i+1] = g; d[i+2] = b; d[i+3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
    return this._finalize(canvas);
  }

  // ============================================================
  // JUPITER — horizontal atmospheric bands, Great Red Spot region
  // ============================================================
  static generateJupiterTexture() {
    const W = 2048, H = 1024;
    const { canvas, ctx } = this.createCanvas(W, H);
    const img = ctx.createImageData(W, H); const d = img.data;

    const bandColors = [
      [210, 160, 110], // warm tan
      [185, 130,  90], // dark ochre
      [235, 200, 155], // pale cream
      [195, 145, 100], // medium rust
      [225, 185, 135], // light tan
      [170, 110,  75], // deep rust
      [240, 215, 170], // near white
    ];

    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const u = x / W, v = y / H;
        const p = this.uvTo3D(u, v);
        // Band index driven by latitude + noise turbulence
        const bandNoise = perlin.fBm(p.x * 2, p.y * 14, p.z * 2, 4, 0.5);
        const turbulence = perlin.fBm(p.x * 8, p.y * 4, p.z * 8, 5, 0.5) * 0.12;
        const bandVal = ((v + turbulence) * 12) % 1;
        const bandIdx  = Math.floor(((v + turbulence) * 12)) % bandColors.length;
        const nextIdx  = (bandIdx + 1) % bandColors.length;
        const blend    = bandVal;
        const c1 = bandColors[bandIdx], c2 = bandColors[nextIdx];

        let r = c1[0] * (1 - blend) + c2[0] * blend;
        let g = c1[1] * (1 - blend) + c2[1] * blend;
        let b = c1[2] * (1 - blend) + c2[2] * blend;

        // Add band-detail noise
        r += (bandNoise - 0.5) * 30;
        g += (bandNoise - 0.5) * 20;
        b += (bandNoise - 0.5) * 10;

        // Great Red Spot region — roughly 22°S latitude, 360° randomly placed longitude
        const latDeg  = (0.5 - v) * 180;
        const lonDeg  = u * 360;
        const grsLat  = -22, grsLon = 100;
        const grsDist = Math.sqrt(Math.pow(latDeg - grsLat, 2) + Math.pow(((lonDeg - grsLon + 540) % 360) - 180, 2));
        if (grsDist < 12) {
          const grs = 1 - grsDist / 12;
          r += grs * 60; g -= grs * 20; b -= grs * 25;
        }

        const i = (y * W + x) * 4;
        d[i] = clamp(r); d[i+1] = clamp(g); d[i+2] = clamp(b); d[i+3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
    return this._finalize(canvas);
  }

  // ============================================================
  // SATURN — pale golden bands
  // ============================================================
  static generateSaturnTexture() {
    const W = 1024, H = 512;
    const { canvas, ctx } = this.createCanvas(W, H);
    const img = ctx.createImageData(W, H); const d = img.data;
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const v = y / H;
        const p = this.uvTo3D(x / W, v);
        const band = perlin.fBm(p.x * 1.5, p.y * 14, p.z * 1.5, 4, 0.5);
        const detail = perlin.fBm(p.x * 6,  p.y * 20,  p.z * 6,  3, 0.45);
        const val = band * 0.65 + detail * 0.35;
        const i = (y * W + x) * 4;
        d[i]   = clamp(200 + val * 55);
        d[i+1] = clamp(175 + val * 45);
        d[i+2] = clamp(115 + val * 30);
        d[i+3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
    return this._finalize(canvas);
  }

  // ============================================================
  // SATURN RINGS — transparent gradient with Cassini division
  // ============================================================
  static generateSaturnRingsTexture() {
    const W = 1024, H = 4;
    const { canvas, ctx } = this.createCanvas(W, H);
    const img = ctx.createImageData(W, H); const d = img.data;

    for (let x = 0; x < W; x++) {
      const t = x / W; // 0 = inner edge, 1 = outer edge
      // Ring zones (approximate Cassini / Huygens gap positions)
      let opacity = 0;
      if      (t < 0.08)               opacity = 0;                         // Inner gap
      else if (t < 0.38)               opacity = 0.55 + Math.sin(t * 80) * 0.15; // B ring
      else if (t > 0.38 && t < 0.44)  opacity = 0.08;                      // Cassini division
      else if (t < 0.72)               opacity = 0.75 + Math.sin(t * 120) * 0.10; // A ring
      else if (t > 0.72 && t < 0.75)  opacity = 0.05;                      // Encke gap
      else if (t < 0.90)               opacity = 0.30 + t * 0.15;          // Outer A ring
      else                             opacity = 0;                         // F ring gap

      opacity = Math.min(0.92, Math.max(0, opacity));
      for (let y = 0; y < H; y++) {
        const i = (y * W + x) * 4;
        d[i]   = 220; d[i+1] = 198; d[i+2] = 155;
        d[i+3] = Math.floor(opacity * 255);
      }
    }
    ctx.putImageData(img, 0, 0);
    // Do NOT apply sRGB to ring opacity map — it's a radial alpha channel data texture
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.ClampToEdgeWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.anisotropy = 8;
    return tex;
  }

  // ============================================================
  // URANUS — methane cyan ice giant
  // ============================================================
  static generateUranusTexture() {
    const W = 1024, H = 512;
    const { canvas, ctx } = this.createCanvas(W, H);
    const img = ctx.createImageData(W, H); const d = img.data;
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const p = this.uvTo3D(x / W, y / H);
        const n1 = perlin.fBm(p.x * 3, p.y * 8,  p.z * 3,  4, 0.5);
        const n2 = perlin.fBm(p.x * 8, p.y * 18, p.z * 8,  3, 0.45);
        const val = n1 * 0.6 + n2 * 0.4;
        const i = (y * W + x) * 4;
        d[i]   = clamp(60  + val * 40);
        d[i+1] = clamp(155 + val * 45);
        d[i+2] = clamp(195 + val * 55);
        d[i+3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
    return this._finalize(canvas);
  }

  static generateUranusRingsTexture() {
    const W = 256, H = 4;
    const { canvas, ctx } = this.createCanvas(W, H);
    const img = ctx.createImageData(W, H); const d = img.data;
    for (let x = 0; x < W; x++) {
      const t = x / W;
      const opacity = (t > 0.1 && t < 0.9) ? 0.30 : 0.0;
      for (let y = 0; y < H; y++) {
        const i = (y * W + x) * 4;
        d[i] = 180; d[i+1] = 215; d[i+2] = 240; d[i+3] = Math.floor(opacity * 255);
      }
    }
    ctx.putImageData(img, 0, 0);
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.ClampToEdgeWrapping;
    return tex;
  }

  // ============================================================
  // NEPTUNE — deep cobalt blue ice giant, storm bands
  // ============================================================
  static generateNeptuneTexture() {
    const W = 1024, H = 512;
    const { canvas, ctx } = this.createCanvas(W, H);
    const img = ctx.createImageData(W, H); const d = img.data;
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const p = this.uvTo3D(x / W, y / H);
        const n1 = perlin.fBm(p.x * 3.5, p.y * 10, p.z * 3.5, 5, 0.5);
        const n2 = perlin.fBm(p.x * 9,   p.y * 20, p.z * 9,   3, 0.48);
        const val = n1 * 0.7 + n2 * 0.3;
        const i = (y * W + x) * 4;
        d[i]   = clamp(15  + val * 45);
        d[i+1] = clamp(40  + val * 60);
        d[i+2] = clamp(130 + val * 90);
        d[i+3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
    return this._finalize(canvas);
  }

  // ============================================================
  // MOON — grey cratered regolith
  // ============================================================
  static generateMoonTexture() {
    const W = 1024, H = 512;
    const { canvas, ctx } = this.createCanvas(W, H);
    const img = ctx.createImageData(W, H); const d = img.data;
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const p = this.uvTo3D(x / W, y / H);
        const n = perlin.fBm(p.x * 6, p.y * 6, p.z * 6, 6, 0.5);
        const shade = clamp(120 + n * 95);
        const i = (y * W + x) * 4;
        d[i] = shade; d[i+1] = shade; d[i+2] = clamp(shade * 0.97); d[i+3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
    return this._finalize(canvas);
  }

  // ============================================================
  // IO — sulphur yellow-green volcanic moon
  // ============================================================
  static generateIoTexture() {
    const W = 1024, H = 512;
    const { canvas, ctx } = this.createCanvas(W, H);
    const img = ctx.createImageData(W, H); const d = img.data;
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const p = this.uvTo3D(x / W, y / H);
        const n  = perlin.fBm(p.x * 8, p.y * 8, p.z * 8, 5, 0.5);
        const n2 = perlin.fBm(p.x * 18 + 30, p.y * 18 + 30, p.z * 18 + 30, 4, 0.5);
        const i = (y * W + x) * 4;
        d[i]   = clamp(215 + n * 40 - n2 * 10);
        d[i+1] = clamp(160 + n * 55);
        d[i+2] = clamp(15  + n * 35);
        d[i+3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
    return this._finalize(canvas);
  }

  // ============================================================
  // EUROPA — icy white with reddish crack network
  // ============================================================
  static generateEuropaTexture() {
    const W = 1024, H = 512;
    const { canvas, ctx } = this.createCanvas(W, H);
    const img = ctx.createImageData(W, H); const d = img.data;
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const p = this.uvTo3D(x / W, y / H);
        const base  = perlin.fBm(p.x * 6,  p.y * 6,  p.z * 6,  5, 0.5);
        const crack = perlin.fBm(p.x * 18, p.y * 18, p.z * 18, 4, 0.55);
        const isCrack = crack < 0.36;
        const i = (y * W + x) * 4;
        if (isCrack) {
          d[i] = clamp(160 + base * 40); d[i+1] = clamp(70 + base * 30); d[i+2] = clamp(50 + base * 20);
        } else {
          const s = clamp(220 + base * 35);
          d[i] = s; d[i+1] = s; d[i+2] = clamp(s * 1.04);
        }
        d[i+3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
    return this._finalize(canvas);
  }

  // ============================================================
  // GANYMEDE — dark and icy patchwork terrain
  // ============================================================
  static generateGanymedeTexture() {
    const W = 1024, H = 512;
    const { canvas, ctx } = this.createCanvas(W, H);
    const img = ctx.createImageData(W, H); const d = img.data;
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const p = this.uvTo3D(x / W, y / H);
        const n = perlin.fBm(p.x * 5, p.y * 5, p.z * 5, 6, 0.5);
        const shade = clamp(80 + n * 110);
        const warm = clamp(shade * 0.95);
        const i = (y * W + x) * 4;
        d[i] = warm; d[i+1] = warm; d[i+2] = shade; d[i+3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
    return this._finalize(canvas);
  }

  // ============================================================
  // CALLISTO — dark ancient cratered surface
  // ============================================================
  static generateCallistoTexture() {
    const W = 1024, H = 512;
    const { canvas, ctx } = this.createCanvas(W, H);
    const img = ctx.createImageData(W, H); const d = img.data;
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const p = this.uvTo3D(x / W, y / H);
        const n = perlin.fBm(p.x * 7, p.y * 7, p.z * 7, 5, 0.5);
        const shade = clamp(45 + n * 75);
        const i = (y * W + x) * 4;
        d[i] = shade; d[i+1] = clamp(shade * 0.98); d[i+2] = clamp(shade * 0.94); d[i+3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
    return this._finalize(canvas);
  }

  // ============================================================
  // TITAN — thick orange haze atmosphere
  // ============================================================
  static generateTitanTexture() {
    const W = 1024, H = 512;
    const { canvas, ctx } = this.createCanvas(W, H);
    const img = ctx.createImageData(W, H); const d = img.data;
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const p = this.uvTo3D(x / W, y / H);
        const n = perlin.fBm(p.x * 4 + (x/W)*2, p.y * 10, p.z * 4, 5, 0.5);
        const i = (y * W + x) * 4;
        d[i]   = clamp(195 + n * 55);
        d[i+1] = clamp(130 + n * 50);
        d[i+2] = clamp(40  + n * 30);
        d[i+3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
    return this._finalize(canvas);
  }

  // ============================================================
  // ENCELADUS — bright white icy moon
  // ============================================================
  static generateEnceladusTexture() {
    const W = 512, H = 256;
    const { canvas, ctx } = this.createCanvas(W, H);
    const img = ctx.createImageData(W, H); const d = img.data;
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const p = this.uvTo3D(x / W, y / H);
        const n = perlin.fBm(p.x * 10, p.y * 10, p.z * 10, 4, 0.5);
        const shade = clamp(230 + n * 25);
        const i = (y * W + x) * 4;
        d[i] = shade; d[i+1] = shade; d[i+2] = 255; d[i+3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
    return this._finalize(canvas);
  }

  // ============================================================
  // RHEA — greyish icy Saturnian moon
  // ============================================================
  static generateRheaTexture() {
    const W = 512, H = 256;
    const { canvas, ctx } = this.createCanvas(W, H);
    const img = ctx.createImageData(W, H); const d = img.data;
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const p = this.uvTo3D(x / W, y / H);
        const n = perlin.fBm(p.x * 8, p.y * 8, p.z * 8, 5, 0.5);
        const shade = clamp(140 + n * 80);
        const i = (y * W + x) * 4;
        d[i] = shade; d[i+1] = shade; d[i+2] = clamp(shade * 1.02); d[i+3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
    return this._finalize(canvas);
  }

  // ============================================================
  // IAPETUS — two-tone dark/light surface
  // ============================================================
  static generateIapetusTexture() {
    const W = 512, H = 256;
    const { canvas, ctx } = this.createCanvas(W, H);
    const img = ctx.createImageData(W, H); const d = img.data;
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const u = x / W;
        const p = this.uvTo3D(u, y / H);
        const n = perlin.fBm(p.x * 5, p.y * 5, p.z * 5, 5, 0.5);
        // Leading hemisphere is dark, trailing is bright
        const dark = u < 0.5 ? Math.pow(1 - u * 2, 0.6) : 0;
        const shade = clamp(160 + n * 80 - dark * 140);
        const i = (y * W + x) * 4;
        d[i] = clamp(shade * 0.92); d[i+1] = clamp(shade * 0.88); d[i+2] = shade; d[i+3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
    return this._finalize(canvas);
  }

  // ============================================================
  // TRITON — greenish frozen nitrogen moon
  // ============================================================
  static generateTritonTexture() {
    const W = 512, H = 256;
    const { canvas, ctx } = this.createCanvas(W, H);
    const img = ctx.createImageData(W, H); const d = img.data;
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const p = this.uvTo3D(x / W, y / H);
        const n = perlin.fBm(p.x * 7, p.y * 7, p.z * 7, 5, 0.5);
        const i = (y * W + x) * 4;
        d[i]   = clamp(80  + n * 50);
        d[i+1] = clamp(160 + n * 60);
        d[i+2] = clamp(130 + n * 55);
        d[i+3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
    return this._finalize(canvas);
  }

  // ============================================================
  // PHOBOS — dark reddish-brown irregular moon
  // ============================================================
  static generatePhobosTexture() {
    const W = 512, H = 256;
    const { canvas, ctx } = this.createCanvas(W, H);
    const img = ctx.createImageData(W, H); const d = img.data;
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const p = this.uvTo3D(x / W, y / H);
        const n = perlin.fBm(p.x * 10, p.y * 10, p.z * 10, 5, 0.5);
        const shade = clamp(60 + n * 65);
        const i = (y * W + x) * 4;
        d[i] = shade; d[i+1] = clamp(shade * 0.94); d[i+2] = clamp(shade * 0.88); d[i+3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
    return this._finalize(canvas);
  }

  // ============================================================
  // DEIMOS — slightly brighter than Phobos
  // ============================================================
  static generateDeimosTexture() {
    const W = 256, H = 128;
    const { canvas, ctx } = this.createCanvas(W, H);
    const img = ctx.createImageData(W, H); const d = img.data;
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const p = this.uvTo3D(x / W, y / H);
        const n = perlin.fBm(p.x * 12 + 50, p.y * 12 + 50, p.z * 12 + 50, 4, 0.5);
        const shade = clamp(80 + n * 70);
        const i = (y * W + x) * 4;
        d[i] = shade; d[i+1] = clamp(shade * 0.95); d[i+2] = clamp(shade * 0.90); d[i+3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
    return this._finalize(canvas);
  }

  // ============================================================
  // URANIAN MOONS (Titania, Oberon, Ariel, Umbriel, Miranda)
  // ============================================================
  static generateUranusMoonTexture(brightness = 100) {
    const W = 512, H = 256;
    const { canvas, ctx } = this.createCanvas(W, H);
    const img = ctx.createImageData(W, H); const d = img.data;
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const p = this.uvTo3D(x / W, y / H);
        const n = perlin.fBm(p.x * 8 + brightness * 0.1, p.y * 8, p.z * 8, 5, 0.5);
        const shade = clamp(brightness + n * 70);
        const i = (y * W + x) * 4;
        d[i] = shade; d[i+1] = shade; d[i+2] = clamp(shade * 0.98); d[i+3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
    return this._finalize(canvas);
  }

  // ============================================================
  // GENERIC SATELLITE — fallback for unrecognized IDs
  // ============================================================
  static generateGenericSatelliteTexture() {
    const W = 256, H = 128;
    const { canvas, ctx } = this.createCanvas(W, H);
    const img = ctx.createImageData(W, H); const d = img.data;
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const p = this.uvTo3D(x / W, y / H);
        const n = perlin.fBm(p.x * 8, p.y * 8, p.z * 8, 4, 0.5);
        const shade = clamp(100 + n * 80);
        const i = (y * W + x) * 4;
        d[i] = shade; d[i+1] = shade; d[i+2] = shade; d[i+3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
    return this._finalize(canvas);
  }

  // ============================================================
  // MAIN DISPATCHER — maps textureType key → generator function
  // ============================================================
  static getTexture(type) {
    switch (type) {
      // Sun
      case 'sun':            return this.generateSunTexture();
      // Planets
      case 'mercury':        return this.generateMercuryTexture();
      case 'venus':          return this.generateVenusTexture();
      case 'earth':
      case 'earthDay':       return this.generateEarthTexture();
      case 'earthNight':     return this.generateEarthNightTexture();
      case 'earthClouds':    return this.generateEarthCloudTexture();
      case 'mars':           return this.generateMarsTexture();
      case 'jupiter':        return this.generateJupiterTexture();
      case 'saturn':         return this.generateSaturnTexture();
      case 'saturnRings':    return this.generateSaturnRingsTexture();
      case 'uranus':         return this.generateUranusTexture();
      case 'uranusRings':    return this.generateUranusRingsTexture();
      case 'neptune':        return this.generateNeptuneTexture();
      // Natural moons
      case 'moon':           return this.generateMoonTexture();
      case 'io':             return this.generateIoTexture();
      case 'europa':         return this.generateEuropaTexture();
      case 'ganymede':       return this.generateGanymedeTexture();
      case 'callisto':       return this.generateCallistoTexture();
      case 'titan':          return this.generateTitanTexture();
      case 'enceladus':      return this.generateEnceladusTexture();
      case 'rhea':           return this.generateRheaTexture();
      case 'iapetus':        return this.generateIapetusTexture();
      case 'triton':         return this.generateTritonTexture();
      case 'phobos':         return this.generatePhobosTexture();
      case 'deimos':         return this.generateDeimosTexture();
      case 'titania':        return this.generateUranusMoonTexture(110);
      case 'oberon':         return this.generateUranusMoonTexture(95);
      case 'ariel':          return this.generateUranusMoonTexture(130);
      case 'umbriel':        return this.generateUranusMoonTexture(75);
      case 'miranda':        return this.generateUranusMoonTexture(120);
      // Default fallback — should never silently return undefined
      default:
        console.warn(`[TextureGenerator] Unknown texture type: '${type}'. Using generic satellite texture.`);
        return this.generateGenericSatelliteTexture();
    }
  }
}
