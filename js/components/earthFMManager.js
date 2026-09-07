import * as THREE from 'three';
import { CosmosApi } from '../services/cosmosApi.js';

/**
 * Earth FM — Interactive Global Radio Explorer Component
 * Handles 3D Earth globe click raycasting, spherical latitude/longitude conversion,
 * 3D rotating pin marker, backend radio station lookup, and live stream audio playback.
 */
const COUNTRY_LOCATIONS = [
  { name: 'INDIA', lat: 20.59, lon: 78.96 },
  { name: 'UNITED STATES', lat: 37.09, lon: -95.71 },
  { name: 'UNITED KINGDOM', lat: 55.37, lon: -3.43 },
  { name: 'JAPAN', lat: 36.20, lon: 138.25 },
  { name: 'AUSTRALIA', lat: -25.27, lon: 133.77 },
  { name: 'BRAZIL', lat: -14.23, lon: -51.92 },
  { name: 'GERMANY', lat: 51.16, lon: 10.45 },
  { name: 'FRANCE', lat: 46.22, lon: 2.21 },
  { name: 'EGYPT', lat: 26.82, lon: 30.80 },
  { name: 'SOUTH AFRICA', lat: -30.55, lon: 22.93 },
  { name: 'CANADA', lat: 56.13, lon: -106.34 },
  { name: 'MEXICO', lat: 23.63, lon: -102.55 },
  { name: 'ARGENTINA', lat: -38.41, lon: -63.61 },
  { name: 'CHINA', lat: 35.86, lon: 104.19 },
  { name: 'RUSSIA', lat: 61.52, lon: 105.31 },
  { name: 'SPAIN', lat: 40.46, lon: -3.74 },
  { name: 'ITALY', lat: 41.87, lon: 12.56 }
];

export class EarthFMManager {
  constructor(scene, camera, renderer, cameraAnimator) {
    this.scene = scene;
    this.camera = camera;
    this.renderer = renderer;
    this.cameraAnimator = cameraAnimator;

    this.earthFMMode = false;
    this.earthMesh = null;
    this.markerGroup = null;
    this.countryLabelsGroup = null;

    this.selectedLocation = null; // { latitude, longitude, placeName, localPoint }
    this.stations = [];
    this.activeStation = null;
    this.loadingStations = false;
    this.searchRadiusKm = 50;

    // HTML5 Audio Engine
    this.audio = new Audio();
    this.isPlaying = false;
    this.isAudioLoading = false;
    this.audioError = null;

    this.hudContainer = null;
    this.panelContainer = null;
    this.audioBarContainer = null;

    this.onExitCallback = null;
    this.onEnterCallback = null;

    this.initAudioEngine();
    this.createUIElements();
  }

  setEarthMesh(mesh) {
    this.earthMesh = mesh;
  }

  initAudioEngine() {
    this.audio.crossOrigin = 'anonymous';

    this.audio.addEventListener('playing', () => {
      this.isPlaying = true;
      this.isAudioLoading = false;
      this.audioError = null;
      this.updateAudioBarUI();
      this.renderStationListUI();
    });

    this.audio.addEventListener('pause', () => {
      this.isPlaying = false;
      this.updateAudioBarUI();
      this.renderStationListUI();
    });

    this.audio.addEventListener('waiting', () => {
      this.isAudioLoading = true;
      this.updateAudioBarUI();
    });

    this.audio.addEventListener('error', (e) => {
      console.warn('[Earth FM Audio Error]', e);
      this.isPlaying = false;
      this.isAudioLoading = false;
      this.audioError = 'This station stream is currently unavailable or offline. Try selecting another station.';
      this.updateAudioBarUI();
      this.renderStationListUI();
    });
  }

  createUIElements() {
    // 1. Top HUD Header & Center Instruction
    this.hudContainer = document.createElement('div');
    this.hudContainer.id = 'earth-fm-hud';
    this.hudContainer.className = 'earth-fm-hud hidden';
    this.hudContainer.innerHTML = `
      <div class="efm-header">
        <div class="efm-title-group">
          <span class="efm-badge">EARTH FM</span>
          <h2 class="efm-title">INTERACTIVE GLOBAL RADIO EXPLORER</h2>
        </div>
        <button id="efm-exit-btn" class="efm-exit-btn">✕ Exit Earth FM</button>
      </div>
      <div class="efm-instruction" id="efm-instruction">
        <span class="efm-pulse-dot"></span>
        <span>CLICK ANYWHERE ON EARTH TO DISCOVER LOCAL RADIO</span>
      </div>
    `;
    document.body.appendChild(this.hudContainer);

    // 2. Station List Panel (Right side)
    this.panelContainer = document.createElement('div');
    this.panelContainer.id = 'earth-fm-panel';
    this.panelContainer.className = 'earth-fm-panel hidden';
    document.body.appendChild(this.panelContainer);

    // 3. Bottom Persistent Audio Player Bar
    this.audioBarContainer = document.createElement('div');
    this.audioBarContainer.id = 'earth-fm-audio-bar';
    this.audioBarContainer.className = 'earth-fm-audio-bar hidden';
    document.body.appendChild(this.audioBarContainer);

    // Event listeners
    const exitBtn = document.getElementById('efm-exit-btn');
    if (exitBtn) {
      exitBtn.addEventListener('click', () => {
        this.exitEarthFM();
      });
    }
  }

  getLocalSolarStatus(lat, lon, date = new Date()) {
    const utcHours = date.getUTCHours() + date.getUTCMinutes() / 60 + date.getUTCSeconds() / 3600;
    const localSolarHours = (utcHours + (lon / 15) + 24) % 24;

    if (localSolarHours >= 5.25 && localSolarHours < 7.25) {
      return { code: 'SUNRISE', icon: '🌅', label: 'SUNRISE', color: '#fbbf24' };
    } else if (localSolarHours >= 7.25 && localSolarHours < 17.25) {
      return { code: 'DAYTIME', icon: '☀️', label: 'DAYTIME', color: '#38bdf8' };
    } else if (localSolarHours >= 17.25 && localSolarHours < 19.25) {
      return { code: 'SUNSET', icon: '🌇', label: 'SUNSET', color: '#f97316' };
    } else {
      return { code: 'NIGHTTIME', icon: '🌙', label: 'NIGHTTIME', color: '#818cf8' };
    }
  }

  createCountryLabelSprite(countryName, lat = 0, lon = 0) {
    const solar = this.getLocalSolarStatus(lat, lon);

    const canvas = document.createElement('canvas');
    canvas.width = 384;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');

    // Transparent background — no background box or border
    ctx.clearRect(0, 0, 384, 64);

    // Outer glow & dark shadow for crisp contrast over land & ocean
    ctx.shadowColor = 'rgba(4, 9, 20, 0.95)';
    ctx.shadowBlur = 8;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 2;

    // Dark text outline
    ctx.strokeStyle = 'rgba(4, 9, 20, 0.9)';
    ctx.lineWidth = 4;
    ctx.font = '800 16px "Space Grotesk", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const textStr = `📍 ${countryName.toUpperCase()} • ${solar.icon} ${solar.label}`;
    ctx.strokeText(textStr, 192, 32);

    // Bright glowing solar text fill
    ctx.fillStyle = solar.color || '#38bdf8';
    ctx.fillText(textStr, 192, 32);

    const texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.LinearFilter;
    const spriteMat = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      depthTest: true
    });

    const sprite = new THREE.Sprite(spriteMat);
    sprite.scale.set(1.8, 0.3, 1);
    return sprite;
  }

  createCountryLabels() {
    if (!this.earthMesh) return;
    this.removeCountryLabels();

    this.countryLabelsGroup = new THREE.Group();
    this.countryLabelsGroup.name = 'earth-fm-country-labels';

    const earthRadius = (this.earthMesh.geometry && this.earthMesh.geometry.parameters && this.earthMesh.geometry.parameters.radius) || 2.2;

    COUNTRY_LOCATIONS.forEach(c => {
      const localPos = this.convertLatLonToLocalVector(c.lat, c.lon, earthRadius, 0.12);
      const sprite = this.createCountryLabelSprite(c.name, c.lat, c.lon);
      sprite.position.copy(localPos);
      sprite.userData = { country: c, isCountryLabel: true };
      this.countryLabelsGroup.add(sprite);
    });

    this.earthMesh.add(this.countryLabelsGroup);
  }

  removeCountryLabels() {
    if (this.countryLabelsGroup && this.earthMesh) {
      this.earthMesh.remove(this.countryLabelsGroup);
      this.countryLabelsGroup = null;
    }
  }

  convertLatLonToLocalVector(lat, lon, radius = 2.2, altitude = 0.12) {
    const phi = (lat * Math.PI) / 180;
    const theta = ((lon + 180) * Math.PI) / 180;
    const r = radius + altitude;

    const x = -r * Math.cos(phi) * Math.cos(theta);
    const y = r * Math.sin(phi);
    const z = r * Math.cos(phi) * Math.sin(theta);

    return new THREE.Vector3(x, y, z);
  }

  /**
   * Converts 3D intersection point on Earth mesh into Latitude & Longitude
   */
  convertPointToLatLon(earthMesh, worldPoint) {
    // 1. Convert world point to earthMesh local space
    const localPoint = earthMesh.worldToLocal(worldPoint.clone());

    // 2. Normalize to unit vector on sphere
    const v = localPoint.clone().normalize();

    // 3. Latitude (-90 to +90)
    const latRad = Math.asin(Math.max(-1, Math.min(1, v.y)));
    const latitude = (latRad * 180) / Math.PI;

    // 4. Longitude (-180 to +180) matching equirectangular map texture
    let longitude = (Math.atan2(v.z, -v.x) * (180 / Math.PI)) - 180;
    if (longitude < -180) longitude += 360;
    if (longitude > 180) longitude -= 360;

    return {
      latitude: parseFloat(latitude.toFixed(4)),
      longitude: parseFloat(longitude.toFixed(4)),
      localPoint
    };
  }

  enterEarthFM(earthMesh, earthConfig) {
    if (!earthMesh) return;
    this.earthFMMode = true;
    this.earthMesh = earthMesh;

    // Show HUD
    this.hudContainer.classList.remove('hidden');
    this.panelContainer.classList.remove('hidden');
    this.audioBarContainer.classList.remove('hidden');

    // Create 3D Country Labels attached directly to Earth mesh
    this.createCountryLabels();

    // Camera Focus & Close Zoom on Earth
    if (this.cameraAnimator) {
      if (typeof this.cameraAnimator.focusEarthFM === 'function') {
        this.cameraAnimator.focusEarthFM(earthMesh);
      } else {
        this.cameraAnimator.focusOnObject(earthMesh, 2.2);
      }
    }

    if (this.onEnterCallback) {
      this.onEnterCallback();
    }

    this.renderLocationInfoUI();
    this.renderStationListUI();
    this.updateAudioBarUI();
  }

  exitEarthFM() {
    this.earthFMMode = false;

    // Stop audio
    this.stopAudio();
    this.activeStation = null;

    // Remove 3D marker & country labels
    this.remove3DMarker();
    this.removeCountryLabels();

    // Hide HUD
    this.hudContainer.classList.add('hidden');
    this.panelContainer.classList.add('hidden');
    this.audioBarContainer.classList.add('hidden');

    if (this.onExitCallback) {
      this.onExitCallback();
    }
  }

  /**
   * Handles user click/tap on 3D Earth sphere or 3D Country Labels
   */
  handleEarthClick(intersectionPoint, intersectedObject = null) {
    if (!this.earthFMMode || !this.earthMesh) return;

    let coords;
    // Check if user clicked directly on a 3D Country Label sprite
    if (intersectedObject && intersectedObject.userData && intersectedObject.userData.isCountryLabel) {
      const c = intersectedObject.userData.country;
      const localPoint = this.convertLatLonToLocalVector(c.lat, c.lon, 2.2, 0.08);
      coords = { latitude: c.lat, longitude: c.lon, localPoint };
      this.selectedLocation = {
        latitude: c.lat,
        longitude: c.lon,
        placeName: c.name,
        localPoint
      };
    } else {
      coords = this.convertPointToLatLon(this.earthMesh, intersectionPoint);
      this.selectedLocation = {
        latitude: coords.latitude,
        longitude: coords.longitude,
        placeName: 'Locating...',
        localPoint: coords.localPoint
      };
    }

    // Create 3D pin marker attached to Earth mesh
    this.create3DMarker(coords.localPoint);

    // Hide center instruction after first click
    const inst = document.getElementById('efm-instruction');
    if (inst) inst.style.opacity = '0.3';

    // Render loading location UI
    this.loadingStations = true;
    this.stations = [];
    this.searchQuery = '';
    this.renderLocationInfoUI();
    this.renderStationListUI();

    // Query Express backend Radio Service
    this.fetchNearbyStations(coords.latitude, coords.longitude);
  }

  /**
   * Creates or updates a 3D location marker attached to Earth mesh (Compact Sleek Pointer)
   */
  create3DMarker(localPoint) {
    if (!this.earthMesh) return;

    this.remove3DMarker();

    this.markerGroup = new THREE.Group();
    this.markerGroup.name = 'earth-fm-pin-marker';

    const earthRadius = (this.earthMesh.geometry && this.earthMesh.geometry.parameters && this.earthMesh.geometry.parameters.radius) || 2.2;
    const position = localPoint.clone().normalize().multiplyScalar(earthRadius + 0.035);
    this.markerGroup.position.copy(position);

    // 1. Glowing Pin Head (Compact Sphere)
    const headGeo = new THREE.SphereGeometry(0.045, 16, 16);
    const headMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
    const headMesh = new THREE.Mesh(headGeo, headMat);
    this.markerGroup.add(headMesh);

    // 2. Translucent Halo (Compact Glowing Aura)
    const haloGeo = new THREE.SphereGeometry(0.09, 16, 16);
    const haloMat = new THREE.MeshBasicMaterial({
      color: 0x0284c7,
      transparent: true,
      opacity: 0.6,
      depthWrite: false
    });
    const haloMesh = new THREE.Mesh(haloGeo, haloMat);
    this.markerGroup.add(haloMesh);

    // 3. Target Ring (Compact Sleek Ring)
    const ringGeo = new THREE.RingGeometry(0.06, 0.10, 24);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.8
    });
    const ringMesh = new THREE.Mesh(ringGeo, ringMat);
    ringMesh.lookAt(position.clone().multiplyScalar(2));
    this.markerGroup.add(ringMesh);

    // Add marker directly to Earth mesh so it rotates naturally with Earth
    this.earthMesh.add(this.markerGroup);
  }

  remove3DMarker() {
    if (this.markerGroup && this.earthMesh) {
      this.earthMesh.remove(this.markerGroup);
      this.markerGroup = null;
    }
  }

  async fetchNearbyStations(lat, lon) {
    const data = await CosmosApi.fetchNearbyRadioStations(lat, lon, 50);

    this.loadingStations = false;
    if (data && data.success) {
      this.selectedLocation = {
        latitude: lat,
        longitude: lon,
        placeName: data.location.placeName || `${lat.toFixed(2)}°, ${lon.toFixed(2)}°`
      };
      this.searchRadiusKm = data.searchRadiusKm || 50;
      this.stations = data.stations || [];
    } else {
      this.stations = [];
    }

    this.renderLocationInfoUI();
    this.renderStationListUI();
  }

  getFilteredStations() {
    if (!this.stations) return [];
    if (!this.searchQuery) return this.stations;
    const q = this.searchQuery.toLowerCase().trim();
    return this.stations.filter(s =>
      (s.name && s.name.toLowerCase().includes(q)) ||
      (s.genre && s.genre.toLowerCase().includes(q)) ||
      (s.city && s.city.toLowerCase().includes(q)) ||
      (s.country && s.country.toLowerCase().includes(q)) ||
      (s.frequency && s.frequency.toLowerCase().includes(q))
    );
  }

  renderLocationInfoUI() {
    if (!this.selectedLocation) {
      this.panelContainer.innerHTML = `
        <div class="efm-location-card idle">
          <div class="efm-loc-header">
            <span class="efm-loc-icon">📍</span>
            <span class="efm-loc-title">NO LOCATION SELECTED</span>
          </div>
          <p class="efm-loc-text">Click anywhere on the 3D Earth globe or select a country label to discover live radio streams.</p>
        </div>
      `;
      return;
    }

    const loc = this.selectedLocation;
    const latStr = `${Math.abs(loc.latitude).toFixed(2)}° ${loc.latitude >= 0 ? 'N' : 'S'}`;
    const lonStr = `${Math.abs(loc.longitude).toFixed(2)}° ${loc.longitude >= 0 ? 'E' : 'W'}`;
    const solar = this.getLocalSolarStatus(loc.latitude, loc.longitude);
    const filtered = this.getFilteredStations();

    this.panelContainer.innerHTML = `
      <div class="efm-location-card">
        <div class="efm-loc-header">
          <span class="efm-loc-icon">📍</span>
          <div class="efm-loc-details">
            <h3 class="efm-place-name">${loc.placeName}</h3>
            <span class="efm-coords">${latStr} &bull; ${lonStr}</span>
          </div>
        </div>

        <div class="efm-solar-status-badge" style="color: ${solar.color}; background: ${solar.color}15; border-color: ${solar.color}40;">
          <span>${solar.icon} SOLAR CYCLE: <b>${solar.label}</b></span>
        </div>

        ${this.searchRadiusKm > 50 ? `
          <div class="efm-radius-badge">Showing stations within ${this.searchRadiusKm} km</div>
        ` : ''}
      </div>

      ${this.stations.length > 3 ? `
        <div class="efm-search-container">
          <span class="efm-search-icon">🔍</span>
          <input type="text" id="efm-search-input" class="efm-search-input" placeholder="Search station, genre, city..." value="${this.searchQuery || ''}" />
          ${this.searchQuery ? `<button id="efm-search-clear" class="efm-search-clear">✕</button>` : ''}
        </div>
      ` : ''}

      <div class="efm-stations-header">
        <span class="efm-sh-title">LOCAL RADIO STATIONS</span>
        <span class="efm-sh-count">${this.loadingStations ? 'Searching...' : `${filtered.length} Available`}</span>
      </div>

      <div id="efm-stations-list" class="efm-stations-list">
        ${this.renderStationsMarkup()}
      </div>
    `;

    // Wire Search Input Listener
    const searchInput = document.getElementById('efm-search-input');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.searchQuery = e.target.value;
        this.renderStationListUI();
      });
    }
    const searchClear = document.getElementById('efm-search-clear');
    if (searchClear) {
      searchClear.addEventListener('click', () => {
        this.searchQuery = '';
        this.renderLocationInfoUI();
      });
    }

    this.wireStationCardListeners();
  }

  renderStationsMarkup() {
    if (this.loadingStations) {
      return `
        <div class="efm-placeholder">
          <div class="efm-spinner"></div>
          <span>Discovering local radio stations...</span>
          <span class="efm-ph-sub">Connecting to Radio Browser Network</span>
        </div>
      `;
    }

    const filtered = this.getFilteredStations();

    if (!filtered || filtered.length === 0) {
      return `
        <div class="efm-placeholder">
          <span class="efm-ph-icon">📻</span>
          <span class="efm-ph-title">${this.searchQuery ? 'No Matching Stations' : 'No Stations Found'}</span>
          <span class="efm-ph-sub">${this.searchQuery ? 'Try clearing your search query.' : 'No active radio streams were detected near this location. Try selecting a nearby city or country label.'}</span>
        </div>
      `;
    }

    return filtered.map((st, idx) => {
      const originalIdx = this.stations.indexOf(st);
      const isThisActive = this.activeStation && this.activeStation.id === st.id;
      const isThisPlaying = isThisActive && this.isPlaying;

      return `
        <div class="efm-station-card ${isThisActive ? 'active' : ''}" data-station-idx="${originalIdx}">
          <div class="st-logo-box">
            ${st.logo ? `<img src="${st.logo}" alt="${st.name}" class="st-logo-img" onerror="this.style.display='none'" />` : ''}
            <span class="st-default-icon">🎵</span>
          </div>

          <div class="st-info">
            <h4 class="st-name">${st.name}</h4>
            <span class="st-meta">${st.city ? `${st.city}, ` : ''}${st.country} &bull; ${st.frequency}</span>
            <span class="st-genre">${st.genre || 'Music'} ${st.language ? `&bull; ${st.language}` : ''}</span>
          </div>

          <button class="st-play-btn ${isThisPlaying ? 'playing' : ''}" data-station-idx="${originalIdx}">
            ${isThisPlaying ? '❚❚' : '▶'}
          </button>
        </div>
      `;
    }).join('');
  }

  renderStationListUI() {
    const listEl = document.getElementById('efm-stations-list');
    if (listEl) {
      listEl.innerHTML = this.renderStationsMarkup();
      this.wireStationCardListeners();
    }
  }

  wireStationCardListeners() {
    this.panelContainer.querySelectorAll('.st-play-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const idx = parseInt(btn.getAttribute('data-station-idx'), 10);
        const station = this.stations[idx];
        if (station) {
          this.togglePlayStation(station);
        }
      });
    });

    this.panelContainer.querySelectorAll('.efm-station-card').forEach(card => {
      card.addEventListener('click', () => {
        const idx = parseInt(card.getAttribute('data-station-idx'), 10);
        const station = this.stations[idx];
        if (station) {
          this.togglePlayStation(station);
        }
      });
    });
  }

  togglePlayStation(station) {
    if (this.activeStation && this.activeStation.id === station.id) {
      if (this.isPlaying) {
        this.audio.pause();
      } else {
        this.audio.play().catch(err => {
          console.warn('[Earth FM Autoplay Blocked]', err);
          this.audioError = 'Click PLAY to start live audio stream.';
          this.updateAudioBarUI();
        });
      }
      return;
    }

    // Switch to new station
    this.stopAudio();
    this.activeStation = station;
    this.audioError = null;
    this.isAudioLoading = true;

    this.audio.src = station.streamUrl;
    this.audio.play().catch(err => {
      console.warn('[Earth FM Stream Start Error]', err);
      this.isAudioLoading = false;
      this.audioError = 'Autoplay blocked. Click Play button to start stream.';
      this.updateAudioBarUI();
    });

    this.updateAudioBarUI();
    this.renderStationListUI();
  }

  stopAudio() {
    try {
      this.audio.pause();
      this.audio.currentTime = 0;
      this.audio.src = '';
    } catch (err) {}
    this.isPlaying = false;
    this.isAudioLoading = false;
  }

  updateAudioBarUI() {
    if (!this.activeStation) {
      this.audioBarContainer.innerHTML = `
        <div class="ab-idle">
          <span class="ab-idle-icon">📻</span>
          <span>Select a radio station from the list to start live streaming.</span>
        </div>
      `;
      return;
    }

    const st = this.activeStation;

    this.audioBarContainer.innerHTML = `
      <div class="ab-container">
        <div class="ab-left">
          <button id="ab-play-toggle" class="ab-play-btn ${this.isPlaying ? 'playing' : ''}">
            ${this.isAudioLoading ? '⏳' : (this.isPlaying ? '❚❚' : '▶')}
          </button>
          <div class="ab-details">
            <div class="ab-title-row">
              <span class="ab-live-badge ${this.isPlaying ? 'active' : ''}">🔴 LIVE</span>
              <div class="ab-equalizer ${this.isPlaying ? 'active' : ''}">
                <span class="eq-bar bar-1"></span>
                <span class="eq-bar bar-2"></span>
                <span class="eq-bar bar-3"></span>
                <span class="eq-bar bar-4"></span>
              </div>
              <h4 class="ab-st-name">${st.name}</h4>
            </div>
            <span class="ab-st-sub">${st.city ? `${st.city}, ` : ''}${st.country} &bull; ${st.frequency} &bull; ${st.genre}</span>
          </div>
        </div>

        <div class="ab-right">
          <span class="ab-vol-icon">🔊</span>
          <input type="range" id="ab-vol-slider" class="ab-vol-slider" min="0" max="1" step="0.05" value="${this.audio.volume}" />
        </div>
      </div>

      ${this.audioError ? `
        <div class="ab-error-notice">
          <span>⚠️ ${this.audioError}</span>
        </div>
      ` : ''}
    `;

    // Wire player controls
    const toggleBtn = document.getElementById('ab-play-toggle');
    if (toggleBtn) {
      toggleBtn.addEventListener('click', () => {
        if (this.isPlaying) {
          this.audio.pause();
        } else {
          this.audio.play().catch(err => {
            console.warn('[Audio Bar Play Error]', err);
          });
        }
      });
    }

    const volSlider = document.getElementById('ab-vol-slider');
    if (volSlider) {
      volSlider.addEventListener('input', (e) => {
        this.audio.volume = parseFloat(e.target.value);
      });
    }
  }
}
