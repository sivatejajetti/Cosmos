import { DistanceService } from '../services/distanceService.js';

/**
 * High-Resolution Real Satellite Surface Map Viewer (Houses, Streets & Real Terrain)
 * Powered by Leaflet & Esri World Imagery (Zoom 1 to 19+ down to individual rooftops)
 */
export class SatelliteMapViewer {
  constructor(onCloseCallback) {
    this.onCloseCallback = onCloseCallback;
    this.isOpen = false;
    this.map = null;
    this.currentMarker = null;
    this.currentLayer = 'satellite';

    this.overlay = document.getElementById('satellite-map-overlay');
    this.mapEl = document.getElementById('satellite-map');
    this.coordText = document.getElementById('sat-telemetry-coords');
    this.zoomText = document.getElementById('sat-telemetry-zoom');
    this.closeBtn = document.getElementById('btn-sat-orbit-return');
    this.gpsBtn = document.getElementById('btn-sat-center-gps');

    this.layers = {
      satellite: null,
      labels: null,
      streets: null
    };

    this.init();
  }

  init() {
    if (!this.mapEl) return;

    if (typeof L === 'undefined') {
      console.warn('[SatelliteMapViewer] Leaflet not loaded yet, will retry on open.');
      return;
    }

    try {
      if (!this.map) {
        // Initialize Leaflet Map
        this.map = L.map(this.mapEl, {
          center: [20.5937, 78.9629],
          zoom: 18,
          maxZoom: 19,
          minZoom: 2,
          zoomControl: true,
          attributionControl: false
        });

        // 1. Esri World Imagery (Crystal clear satellite tiles down to house rooftops)
        this.layers.satellite = L.tileLayer(
          'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
          {
            maxZoom: 19,
            maxNativeZoom: 19,
            attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and GIS User Community'
          }
        );

        // 2. CartoDB Labels Layer (for street names, building numbers, landmarks)
        this.layers.labels = L.tileLayer(
          'https://{s}.basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}{r}.png',
          {
            maxZoom: 19,
            subdomains: 'abcd'
          }
        );

        // 3. OpenStreetMap Streets Layer (roads, building footprints, house addresses)
        this.layers.streets = L.tileLayer(
          'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
          {
            maxZoom: 19,
            attribution: '&copy; OpenStreetMap contributors'
          }
        );

        // Default layer: pure high-res satellite
        this.layers.satellite.addTo(this.map);

        // Map Event Handlers
        this.map.on('move', () => this.updateTelemetry());
        this.map.on('zoomend', () => this.updateTelemetry());

        // Close / Return to orbit button
        if (this.closeBtn) {
          this.closeBtn.addEventListener('click', () => this.close());
        }

        // Center on GPS location button
        if (this.gpsBtn) {
          this.gpsBtn.addEventListener('click', () => {
            const loc = DistanceService.userLocation;
            if (loc && typeof loc.lat === 'number') {
              this.flyToLocation(loc.lat, loc.lon, 18, 'Your Live Location');
            }
          });
        }

        // Layer switch buttons
        const layerButtons = document.querySelectorAll('.sat-dock-btn[data-map-layer]');
        layerButtons.forEach(btn => {
          btn.addEventListener('click', () => {
            const layerType = btn.getAttribute('data-map-layer');
            this.switchLayer(layerType);
            layerButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
          });
        });

        // Escape key to exit map
        window.addEventListener('keydown', (e) => {
          if (this.isOpen && e.key === 'Escape') {
            this.close();
          }
        });
      }
    } catch (err) {
      console.warn('[SatelliteMapViewer init]', err);
    }
  }

  switchLayer(type) {
    if (!this.map) return;
    this.currentLayer = type;

    // Clear active layers
    this.map.removeLayer(this.layers.satellite);
    this.map.removeLayer(this.layers.labels);
    this.map.removeLayer(this.layers.streets);

    if (type === 'satellite') {
      this.layers.satellite.addTo(this.map);
    } else if (type === 'hybrid') {
      this.layers.satellite.addTo(this.map);
      this.layers.labels.addTo(this.map);
    } else if (type === 'streets') {
      this.layers.streets.addTo(this.map);
    }
  }

  async open(lat = 20.5937, lon = 78.9629, zoom = 18, label = 'Your Live Location') {
    if (!this.overlay) return;

    this.isOpen = true;
    this.overlay.classList.remove('hidden');

    if (typeof L === 'undefined') {
      await this.ensureLeafletLoaded();
    }

    if (!this.map) this.init();

    setTimeout(() => {
      if (this.map) {
        this.map.invalidateSize();
        this.flyToLocation(lat, lon, zoom, label);
      }
    }, 120);
  }

  ensureLeafletLoaded() {
    if (typeof L !== 'undefined') return Promise.resolve();
    return new Promise((resolve) => {
      const check = setInterval(() => {
        if (typeof L !== 'undefined') {
          clearInterval(check);
          resolve();
        }
      }, 50);
      setTimeout(() => { clearInterval(check); resolve(); }, 3000);
    });
  }

  flyToLocation(lat, lon, zoom = 18, label = 'Your Live Location') {
    if (!this.map) return;

    const latStr = `${Math.abs(lat).toFixed(4)}° ${lat >= 0 ? 'N' : 'S'}`;
    const lonStr = `${Math.abs(lon).toFixed(4)}° ${lon >= 0 ? 'E' : 'W'}`;

    // Remove old marker
    if (this.currentMarker) {
      this.map.removeLayer(this.currentMarker);
      this.currentMarker = null;
    }

    // Custom Glowing Pin Icon
    const customIcon = L.divIcon({
      className: 'sat-custom-marker',
      html: `
        <div class="sat-marker-pin">
          <div class="sat-marker-pulse"></div>
          <div class="sat-marker-dot"></div>
          <div class="sat-marker-label">📍 YOU ARE HERE</div>
        </div>
      `,
      iconSize: [40, 40],
      iconAnchor: [20, 20]
    });

    this.currentMarker = L.marker([lat, lon], { icon: customIcon }).addTo(this.map);

    this.currentMarker.bindPopup(`
      <div style="font-family: 'Space Grotesk', sans-serif; color: #0f172a; min-width: 180px;">
        <strong style="color: #0284c7; font-size: 14px;">📍 ${label.toUpperCase()}</strong><br/>
        <span style="font-size: 12px; color: #475569;">House & Street Level Satellite View</span><br/>
        <div style="margin-top: 6px; font-weight: 600; font-size: 12px;">${latStr}, ${lonStr}</div>
      </div>
    `).openPopup();

    this.map.flyTo([lat, lon], zoom, {
      animate: true,
      duration: 1.8
    });

    this.updateTelemetry();
  }

  updateTelemetry() {
    if (!this.map) return;

    const center = this.map.getCenter();
    const zoom = this.map.getZoom();

    if (this.coordText) {
      const latStr = `${Math.abs(center.lat).toFixed(4)}° ${center.lat >= 0 ? 'N' : 'S'}`;
      const lonStr = `${Math.abs(center.lng).toFixed(4)}° ${center.lng >= 0 ? 'E' : 'W'}`;
      this.coordText.textContent = `LAT: ${latStr} • LON: ${lonStr}`;
    }

    if (this.zoomText) {
      let desc = 'SATELLITE VIEW';
      if (zoom >= 18) desc = 'HOUSE & BUILDING ROOFTOPS';
      else if (zoom >= 16) desc = 'STREET & NEIGHBORHOOD LEVEL';
      else if (zoom >= 13) desc = 'CITY & LANDMARK LEVEL';
      else if (zoom >= 8) desc = 'REGIONAL / STATE LEVEL';
      else desc = 'CONTINENTAL SCALE';

      this.zoomText.textContent = `ZOOM: ${zoom} (${desc})`;
    }
  }

  close() {
    this.isOpen = false;
    if (this.overlay) {
      this.overlay.classList.add('hidden');
    }
    if (this.onCloseCallback) {
      this.onCloseCallback();
    }
  }
}
