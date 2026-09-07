/**
 * Cinematic Landing Page & Rocket Launch Sequence Component for COSMOS
 * Features:
 * - Stunning Glassmorphic HUD landing page with animated stars & nebula glow
 * - High-impact Rocket Launch Animation Sequence with Canvas Particle FX
 * - Web Audio API procedural rocket booster acoustics (zero external audio dependencies)
 * - Camera shake, thruster flame plumes, smoke clouds, and warp transition
 */
export class LandingPage {
  constructor(onLaunchComplete) {
    this.onLaunchComplete = onLaunchComplete;
    this.isLaunching = false;
    this.audioCtx = null;

    this.container = document.getElementById('landing-page');
    this.launchBtn = document.getElementById('landing-launch-btn');
    this.skipBtn = document.getElementById('landing-skip-btn');
    this.canvas = document.getElementById('launch-fx-canvas');
    this.ctx = this.canvas ? this.canvas.getContext('2d') : null;

    this.particles = [];
    this.smokeParticles = [];
    this.animId = null;

    this.init();
  }

  init() {
    if (!this.container) return;

    if (this.launchBtn) {
      this.launchBtn.addEventListener('click', () => this.startLaunchSequence());
    }

    if (this.skipBtn) {
      this.skipBtn.addEventListener('click', () => this.quickBypass());
    }

    // Auto-resize FX canvas
    this.resizeCanvas();
    window.addEventListener('resize', () => this.resizeCanvas());
  }

  resizeCanvas() {
    if (this.canvas) {
      this.canvas.width = window.innerWidth;
      this.canvas.height = window.innerHeight;
    }
  }

  initAudio() {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext && !this.audioCtx) {
        this.audioCtx = new AudioContext();
      }
    } catch (e) {
      console.warn('[Landing Audio Init]', e);
    }
  }

  playBoosterAcoustics(durationSec = 4.5) {
    if (!this.audioCtx) return;
    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }

    const ctx = this.audioCtx;
    const now = ctx.currentTime;

    // 1. Procedural Low-Frequency Booster Rumble Noise
    const bufferSize = ctx.sampleRate * 2;
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    const whiteNoise = ctx.createBufferSource();
    whiteNoise.buffer = noiseBuffer;
    whiteNoise.loop = true;

    // Low-pass filter for thunderous acoustic rumble
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(140, now);
    filter.frequency.exponentialRampToValueAtTime(750, now + durationSec * 0.7);

    // Gain Envelope
    const gainNode = ctx.createGain();
    gainNode.gain.setValueAtTime(0.01, now);
    gainNode.gain.linearRampToValueAtTime(0.45, now + 0.8);
    gainNode.gain.setValueAtTime(0.45, now + durationSec - 1.2);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + durationSec);

    whiteNoise.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(ctx.destination);

    whiteNoise.start(now);
    whiteNoise.stop(now + durationSec);

    // 2. Harmonic Engine Roar (Sub Bass Synth)
    const osc = ctx.createOscillator();
    const oscGain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(45, now);
    osc.frequency.exponentialRampToValueAtTime(120, now + durationSec * 0.8);

    oscGain.gain.setValueAtTime(0.01, now);
    oscGain.gain.linearRampToValueAtTime(0.25, now + 0.5);
    oscGain.gain.exponentialRampToValueAtTime(0.001, now + durationSec);

    osc.connect(oscGain);
    oscGain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + durationSec);
  }

  startLaunchSequence() {
    if (this.isLaunching) return;
    this.isLaunching = true;

    this.initAudio();
    this.playBoosterAcoustics(5.0);

    const rocketStage = document.getElementById('launch-rocket-stage');
    const hudContent = document.getElementById('landing-hud-content');
    const countdownEl = document.getElementById('launch-countdown');

    if (hudContent) {
      hudContent.classList.add('fade-out-content');
    }

    if (countdownEl) {
      countdownEl.classList.add('visible');
    }

    if (rocketStage) {
      rocketStage.classList.add('visible');
    }

    // Countdown sequence: T-3 -> T-2 -> T-1 -> IGNITION & LAUNCH
    let count = 3;
    const runCountdown = () => {
      if (countdownEl) {
        if (count > 0) {
          countdownEl.innerHTML = `<span class="cd-num">T-${count}</span><span class="cd-label">MAIN ENGINE IGNITION</span>`;
          count--;
          setTimeout(runCountdown, 700);
        } else {
          countdownEl.innerHTML = `<span class="cd-num highlight">LIFTOFF!</span><span class="cd-label">MAX-Q VELOCITY REACHED</span>`;
          this.triggerLiftoff();
        }
      } else {
        this.triggerLiftoff();
      }
    };

    setTimeout(runCountdown, 200);
  }

  triggerLiftoff() {
    const rocketStage = document.getElementById('launch-rocket-stage');
    const landingOverlay = this.container;
    const warpSpeedLines = document.getElementById('launch-warp-speed');

    // Start Particle Thruster System
    this.startThrusterParticles();

    // Trigger Screen Acoustic Shake
    if (landingOverlay) {
      landingOverlay.classList.add('shaking');
    }

    // Rocket Ascend
    if (rocketStage) {
      rocketStage.classList.add('ascending');
    }

    // Trigger Warp Speed Lines after 1.8 seconds of liftoff
    setTimeout(() => {
      if (warpSpeedLines) {
        warpSpeedLines.classList.add('active');
      }
    }, 1600);

    // Complete Launch Sequence & Smoothly Transition to 3D Solar System
    setTimeout(() => {
      if (landingOverlay) {
        landingOverlay.classList.add('launch-complete');
        landingOverlay.classList.remove('shaking');
      }

      setTimeout(() => {
        if (landingOverlay) {
          landingOverlay.style.display = 'none';
        }
        this.stopThrusterParticles();
        this.isLaunching = false;

        if (this.onLaunchComplete) {
          this.onLaunchComplete();
        }
      }, 700);
    }, 3800);
  }

  startThrusterParticles() {
    if (!this.ctx) return;
    this.particles = [];
    this.smokeParticles = [];

    const rocket = document.getElementById('launch-rocket');
    
    const loop = () => {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

      let nozzleX = this.canvas.width / 2;
      let nozzleY = this.canvas.height * 0.72;

      if (rocket) {
        const rect = rocket.getBoundingClientRect();
        nozzleX = rect.left + rect.width / 2;
        nozzleY = rect.top + rect.height * (270 / 320);
      }

      // Generate Plume Flame Particles
      for (let i = 0; i < 18; i++) {
        const angle = (Math.PI / 2) + (Math.random() - 0.5) * 0.45;
        const speed = Math.random() * 14 + 10;
        this.particles.push({
          x: nozzleX + (Math.random() - 0.5) * 26,
          y: nozzleY,
          vx: Math.cos(angle) * speed * (Math.random() - 0.5) * 1.5,
          vy: Math.sin(angle) * speed,
          radius: Math.random() * 12 + 6,
          life: 1.0,
          decay: Math.random() * 0.04 + 0.03,
          color: Math.random() > 0.4 ? '#ff6b00' : (Math.random() > 0.5 ? '#ffaa00' : '#ffffff')
        });
      }

      // Generate Smoke Cloud Particles
      for (let j = 0; j < 6; j++) {
        this.smokeParticles.push({
          x: nozzleX + (Math.random() - 0.5) * 40,
          y: nozzleY + Math.random() * 20,
          vx: (Math.random() - 0.5) * 8,
          vy: Math.random() * 5 + 3,
          radius: Math.random() * 18 + 14,
          life: 1.0,
          decay: Math.random() * 0.02 + 0.015,
          color: 'rgba(180, 195, 215, 0.4)'
        });
      }

      // Draw & Update Flame Particles
      for (let i = this.particles.length - 1; i >= 0; i--) {
        const p = this.particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.radius *= 0.96;
        p.life -= p.decay;

        if (p.life <= 0 || p.radius <= 0.5) {
          this.particles.splice(i, 1);
          continue;
        }

        this.ctx.save();
        this.ctx.globalAlpha = p.life;
        this.ctx.fillStyle = p.color;
        this.ctx.shadowColor = p.color;
        this.ctx.shadowBlur = 15;
        this.ctx.beginPath();
        this.ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.restore();
      }

      // Draw & Update Smoke Particles
      for (let j = this.smokeParticles.length - 1; j >= 0; j--) {
        const s = this.smokeParticles[j];
        s.x += s.vx;
        s.y += s.vy;
        s.radius += 0.8;
        s.life -= s.decay;

        if (s.life <= 0) {
          this.smokeParticles.splice(j, 1);
          continue;
        }

        this.ctx.save();
        this.ctx.globalAlpha = s.life * 0.35;
        this.ctx.fillStyle = s.color;
        this.ctx.beginPath();
        this.ctx.arc(s.x, s.y, s.radius, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.restore();
      }

      this.animId = requestAnimationFrame(loop);
    };

    loop();
  }

  stopThrusterParticles() {
    if (this.animId) {
      cancelAnimationFrame(this.animId);
      this.animId = null;
    }
    if (this.ctx && this.canvas) {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
  }

  quickBypass() {
    if (this.container) {
      this.container.classList.add('launch-complete');
      setTimeout(() => {
        this.container.style.display = 'none';
        if (this.onLaunchComplete) this.onLaunchComplete();
      }, 400);
    } else {
      if (this.onLaunchComplete) this.onLaunchComplete();
    }
  }

  show() {
    if (!this.container) return;
    this.container.style.display = 'flex';
    this.container.classList.remove('launch-complete', 'shaking');

    const hudContent = document.getElementById('landing-hud-content');
    if (hudContent) hudContent.classList.remove('fade-out-content');

    const rocketStage = document.getElementById('launch-rocket-stage');
    if (rocketStage) rocketStage.classList.remove('visible', 'ascending');

    const countdownEl = document.getElementById('launch-countdown');
    if (countdownEl) countdownEl.classList.remove('visible');

    const warpSpeedLines = document.getElementById('launch-warp-speed');
    if (warpSpeedLines) warpSpeedLines.classList.remove('active');

    this.stopThrusterParticles();
    this.isLaunching = false;
  }
}
