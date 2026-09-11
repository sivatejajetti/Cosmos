import { PLANETS_DATA, SUN_CONFIG } from '../config/planetsData.js';
import { SATELLITES_DATA } from '../config/satellitesData.js';
import { ARTIFICIAL_SATELLITES_DATA } from '../config/artificialSatellitesData.js';

/**
 * Top Navigation Bar, Categorized Objects Drawer & Hierarchical Breadcrumb Component
 */
export class TopNav {
  constructor(onSelectObject, onOpenHelp) {
    this.onSelectObject = onSelectObject;
    this.onOpenHelp = onOpenHelp;

    this.objectsMenu = document.getElementById('nav-objects-dropdown');
    this.objectsToggleBtn = document.getElementById('nav-btn-objects');
    this.aboutModal = document.getElementById('modal-about');
    this.breadcrumbContainer = document.getElementById('nav-breadcrumb');

    this.init();
  }

  init() {
    // Populate Categorized Objects Drawer
    if (this.objectsMenu) {
      const planets = [SUN_CONFIG, ...PLANETS_DATA];
      const moons = SATELLITES_DATA.slice(0, 8); // Top major moons
      const isroMissions = ARTIFICIAL_SATELLITES_DATA.filter(s => s.countryAgency.includes('ISRO'));
      const telescopes = ARTIFICIAL_SATELLITES_DATA.filter(s => s.missionType.toLowerCase().includes('astronomy') || s.name.includes('Webb') || s.name.includes('Hubble'));
      const pioneers = ARTIFICIAL_SATELLITES_DATA.filter(s => s.layer === 'pioneers' && !s.countryAgency.includes('ISRO'));

      this.objectsMenu.innerHTML = `
        <div class="drawer-section-title">PLANETS & STARS</div>
        ${planets.map(obj => `
          <button class="drawer-item" data-id="${obj.id}">
            <span class="drawer-item-dot" style="background-color: #${(obj.color || 0x38bdf8).toString(16).padStart(6, '0')}"></span>
            <span class="drawer-item-name">${obj.name}</span>
            <span class="drawer-item-type">${obj.type || ''}</span>
          </button>
        `).join('')}

        <div class="drawer-section-title">MAJOR MOONS</div>
        ${moons.map(obj => `
          <button class="drawer-item" data-id="${obj.id}">
            <span class="drawer-item-dot" style="background-color: #${(obj.color || 0x38bdf8).toString(16).padStart(6, '0')}"></span>
            <span class="drawer-item-name">${obj.name}</span>
            <span class="drawer-item-type">Moon</span>
          </button>
        `).join('')}

        <div class="drawer-section-title">🚀 ISRO MISSIONS</div>
        ${isroMissions.map(obj => `
          <button class="drawer-item" data-id="${obj.id}">
            <span class="drawer-item-dot" style="background-color: #f59e0b"></span>
            <span class="drawer-item-name">${obj.name}</span>
            <span class="drawer-item-type">${obj.launchYear}</span>
          </button>
        `).join('')}

        <div class="drawer-section-title">🔭 SPACE TELESCOPES</div>
        ${telescopes.map(obj => `
          <button class="drawer-item" data-id="${obj.id}">
            <span class="drawer-item-dot" style="background-color: #818cf8"></span>
            <span class="drawer-item-name">${obj.name}</span>
            <span class="drawer-item-type">${obj.launchYear}</span>
          </button>
        `).join('')}

        <div class="drawer-section-title">🛰️ SPACE PIONEERS</div>
        ${pioneers.map(obj => `
          <button class="drawer-item" data-id="${obj.id}">
            <span class="drawer-item-dot" style="background-color: #d1d5db"></span>
            <span class="drawer-item-name">${obj.name}</span>
            <span class="drawer-item-type">${obj.launchYear}</span>
          </button>
        `).join('')}
      `;

      this.objectsMenu.querySelectorAll('.drawer-item').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const id = btn.getAttribute('data-id');
          if (this.onSelectObject) this.onSelectObject(id);
          this.closeObjectsDrawer();
        });
      });
    }

    // Toggle Objects Menu
    if (this.objectsToggleBtn) {
      this.objectsToggleBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.toggleObjectsDrawer();
      });
    }

    // Close dropdown when clicking outside
    document.addEventListener('click', () => {
      this.closeObjectsDrawer();
    });

    // About Button & Modal
    const aboutBtn = document.getElementById('nav-btn-about');
    const closeAboutBtn = document.getElementById('about-close-btn');

    if (aboutBtn && this.aboutModal) {
      aboutBtn.addEventListener('click', () => {
        this.aboutModal.classList.add('visible');
      });
    }

    if (closeAboutBtn && this.aboutModal) {
      closeAboutBtn.addEventListener('click', () => {
        this.aboutModal.classList.remove('visible');
      });
    }

    // Help Button
    const helpBtn = document.getElementById('nav-btn-help');
    if (helpBtn) {
      helpBtn.addEventListener('click', () => {
        if (this.onOpenHelp) this.onOpenHelp();
      });
    }

    // Start Live UTC Clock
    this.startUTCClock();
  }

  startUTCClock() {
    this.updateUTCClock();
    setInterval(() => this.updateUTCClock(), 1000);
  }

  updateUTCClock() {
    const clockEl = document.getElementById('utc-clock-time');
    if (clockEl) {
      const now = new Date();
      const h = String(now.getUTCHours()).padStart(2, '0');
      const m = String(now.getUTCMinutes()).padStart(2, '0');
      const s = String(now.getUTCSeconds()).padStart(2, '0');
      clockEl.textContent = `${h}:${m}:${s} UTC`;
    }
  }

  updateBreadcrumb(data) {
    if (!this.breadcrumbContainer) return;

    if (!data) {
      this.breadcrumbContainer.innerHTML = `
        <span class="bc-item active">SOLAR SYSTEM</span>
      `;
      return;
    }

    if (data.category === 'artificial' || data.type === 'satellite' || data.type === 'Natural Satellite' || data.type === 'Galilean Satellite') {
      const parentId = data.parentBodyId || data.parentPlanetId || 'earth';
      const parentName = parentId.toUpperCase();

      this.breadcrumbContainer.innerHTML = `
        <span class="bc-item bc-link" id="bc-solar">SOLAR SYSTEM</span>
        <span class="bc-sep">/</span>
        <span class="bc-item bc-link" id="bc-parent">${parentName}</span>
        <span class="bc-sep">/</span>
        <span class="bc-item active">${data.name.toUpperCase()}</span>
      `;

      const bcSolar = document.getElementById('bc-solar');
      if (bcSolar) bcSolar.addEventListener('click', () => {
        if (this.onSelectObject) this.onSelectObject(null);
      });

      const bcParent = document.getElementById('bc-parent');
      if (bcParent) bcParent.addEventListener('click', () => {
        if (this.onSelectObject) this.onSelectObject(parentId);
      });

    } else {
      this.breadcrumbContainer.innerHTML = `
        <span class="bc-item bc-link" id="bc-solar">SOLAR SYSTEM</span>
        <span class="bc-sep">/</span>
        <span class="bc-item active">${data.name.toUpperCase()}</span>
      `;

      const bcSolar = document.getElementById('bc-solar');
      if (bcSolar) bcSolar.addEventListener('click', () => {
        if (this.onSelectObject) this.onSelectObject(null);
      });
    }
  }

  toggleObjectsDrawer() {
    if (this.objectsMenu) {
      this.objectsMenu.classList.toggle('visible');
    }
  }

  closeObjectsDrawer() {
    if (this.objectsMenu) {
      this.objectsMenu.classList.remove('visible');
    }
  }
}
