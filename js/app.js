import * as THREE from 'three';
import { SceneManager } from './components/sceneManager.js';
import { Starfield } from './components/starfield.js';
import { Sun } from './components/sun.js';
import { PlanetFactory } from './components/planetFactory.js';
import { ControlsManager } from './components/controls.js';
import { InteractionManager } from './components/interactionManager.js';
import { CameraAnimator } from './components/cameraAnimator.js';
import { UIOverlay } from './ui/overlay.js';
import { LoadingScreen } from './ui/loadingScreen.js';
import { LandingPage } from './ui/landingPage.js';
import { TopNav } from './ui/topNav.js';
import { SimControls } from './ui/simControls.js';
import { HelpModal } from './ui/helpModal.js';
import { InfoPanel } from './ui/infoPanel.js';
import { EarthFMManager } from './components/earthFMManager.js';
import { LiveLocationMarker } from './components/liveLocationMarker.js';
import { SatelliteMapViewer } from './components/satelliteMapViewer.js';
import { DistanceService } from './services/distanceService.js';

/**
 * Main Application Core — Segment 6 Wikipedia & Clickable Satellite System
 */
class Application {
  constructor() {
    this.container = document.getElementById('canvas-container');
    this.clock = new THREE.Clock();
    this.timeMultiplier = 1.0;
    
    this.init();
  }

  init() {
    // 1. Scene, Camera & WebGL Renderers
    this.sceneManager = new SceneManager(this.container);

    // 2. Starfield & Central Sun
    this.starfield = new Starfield(this.sceneManager.scene, 3500);
    this.sun = new Sun(this.sceneManager.scene);

    // 3. Planets, Orbit Paths, Natural Moons & Artificial Spacecraft
    this.planetFactory = new PlanetFactory(this.sceneManager.scene);

    // 4. Camera Controls & Camera Animator
    this.controlsManager = new ControlsManager(
      this.sceneManager.camera,
      this.sceneManager.renderer.domElement
    );
    this.cameraAnimator = new CameraAnimator(
      this.sceneManager.camera,
      this.controlsManager
    );

    // 5. Interaction Manager & Unified Raycasting Setup
    this.interactionManager = new InteractionManager(
      this.sceneManager.scene,
      this.sceneManager.camera,
      this.sceneManager.renderer.domElement
    );

    // Register Sun as interactive target
    this.interactionManager.registerTarget(this.sun.mesh, this.sun.config);

    // Register 8 Planets as interactive targets
    this.planetFactory.planets.forEach(p => {
      this.interactionManager.registerTarget(p.planetMesh, p.config);
      if (p.labelSprite) this.interactionManager.registerTarget(p.labelSprite, p.config);
    });

    // Register 17 Natural Satellite Moons as interactive targets
    this.planetFactory.satelliteFactory.satellites.forEach(s => {
      this.interactionManager.registerTarget(s.moonMesh, s.config);
      if (s.labelSprite) this.interactionManager.registerTarget(s.labelSprite, s.config);
    });

    // Register 50+ Artificial Satellites & Spacecraft as interactive targets
    this.planetFactory.artificialSatelliteFactory.spacecraftList.forEach(s => {
      this.interactionManager.registerTarget(s.modelMesh, s.config);
      if (s.labelSprite) this.interactionManager.registerTarget(s.labelSprite, s.config);
    });

    // 6. UI Modules & Earth FM Component
    this.uiOverlay = new UIOverlay();
    this.infoPanel = new InfoPanel();
    this.helpModal = new HelpModal();

    this.earthFMManager = new EarthFMManager(
      this.sceneManager.scene,
      this.sceneManager.camera,
      this.sceneManager.renderer.domElement,
      this.cameraAnimator
    );

    const earthObj = this.planetFactory.planets.find(p => p.config.id === 'earth');
    if (earthObj) {
      this.earthFMManager.setEarthMesh(earthObj.planetMesh);
      this.liveLocationMarker = new LiveLocationMarker(
        earthObj.planetMesh,
        this.sceneManager.scene,
        this.interactionManager
      );
    }
    this.interactionManager.setEarthFMManager(this.earthFMManager);

    this.simControls = new SimControls(
      (speed) => { this.timeMultiplier = speed; },
      (orbitsVisible) => { this.planetFactory.setOrbitPathsVisible(orbitsVisible); },
      (labelsVisible) => { this.planetFactory.setPlanetLabelsVisible(labelsVisible); },
      (layerName, visible) => {
        if (layerName === 'moons') {
          this.planetFactory.satelliteFactory.satellites.forEach(s => { s.pivot.visible = visible; });
        } else {
          this.planetFactory.artificialSatelliteFactory.setLayerVisible(layerName, visible);
        }
      },
      (visualSimEnabled) => {
        this.planetFactory.setVisualSimulationMode(visualSimEnabled);
      }
    );

    this.topNav = new TopNav(
      (id) => {
        if (id) {
          this.interactionManager.selectObjectById(id);
        } else {
          this.interactionManager.deselect();
          this.planetFactory.setActiveFocusParent(null);
          this.cameraAnimator.resetToOverview();
        }
      },
      () => { this.helpModal.toggle(); }
    );

    this.landingPage = new LandingPage(() => {
      // Rocket liftoff complete: animate camera overview into Solar System
      this.cameraAnimator.resetToOverview();
    });

    // Wire EXPLORE button in header to re-open landing page
    const exploreBtn = document.getElementById('nav-btn-explore');
    if (exploreBtn) {
      exploreBtn.addEventListener('click', () => {
        this.landingPage.show();
      });
    }

    this.loadingScreen = new LoadingScreen(() => {
      // 3D engine initialized & loading screen dismissed
    });

    this.lastSatelliteMapCloseTime = 0;
    this.satelliteMapViewer = new SatelliteMapViewer(() => {
      // Returned from Satellite Map back to space orbit
      this.lastSatelliteMapCloseTime = Date.now();
      const earthObj = this.planetFactory.planets.find(p => p.config.id === 'earth');
      if (earthObj) {
        this.planetFactory.setActiveFocusParent('earth');
        this.interactionManager.selectObject(earthObj.planetMesh, earthObj.config);
        this.cameraAnimator.focusOnObject(earthObj.planetMesh, earthObj.config);
      }
    });

    // 7. Connect Callbacks & Hierarchical Navigation
    this.setupCallbacks();

    // 8. Start Main Animation Loop
    this.animate();
  }

  setupCallbacks() {
    // Earth FM Callback
    this.infoPanel.onExploreEarthFMCallback = () => {
      const earthObj = this.planetFactory.planets.find(p => p.config.id === 'earth');
      if (earthObj) {
        this.earthFMManager.enterEarthFM(earthObj.planetMesh, earthObj.config);
      }
    };

    this.earthFMManager.onEnterCallback = () => {
      // Hide Sun, other planets, moons, satellites, and orbit lines
      if (this.sun && this.sun.mesh) this.sun.mesh.visible = false;
      this.planetFactory.setEarthFMMode(true);
      this.planetFactory.setOrbitPathsVisible(false);
    };

    this.earthFMManager.onExitCallback = () => {
      // Restore Sun, other planets, moons, satellites, and orbit lines
      if (this.sun && this.sun.mesh) this.sun.mesh.visible = true;
      this.planetFactory.setEarthFMMode(false);
      this.planetFactory.setOrbitPathsVisible(true);
      this.planetFactory.setActiveFocusParent('earth');
    };
    // On Celestial Object Selected (Planet, Moon, or Artificial Spacecraft)
    this.interactionManager.onSelectCallback = (data, mesh) => {
      this.infoPanel.show(data);
      this.topNav.updateBreadcrumb(data);
      this.uiOverlay.setFocusButtonVisible(true);

      // Contextual Satellite & Orbit Visibility: Show satellite orbits & labels for active parent body
      let parentId = null;
      if (data.type === 'planet' || data.type === 'star') {
        parentId = data.id;
      } else if (data.category === 'artificial') {
        parentId = data.parentBodyId;
      } else if (data.type === 'satellite') {
        parentId = data.parentPlanetId;
      } else if (data.type === 'user_location') {
        parentId = 'earth';
      }

      // Activate satellite orbits and satellite labels for this parent body
      this.planetFactory.setActiveFocusParent(parentId);

      this.cameraAnimator.focusOnObject(mesh, data);
    };

    // On Object Deselected / Clicked Empty Space
    this.interactionManager.onDeselectCallback = () => {
      this.infoPanel.hide();
      this.topNav.updateBreadcrumb(null);
      this.uiOverlay.setFocusButtonVisible(false);
      this.planetFactory.setActiveFocusParent(null);
    };

    // InfoPanel Moon Badge Clicked (e.g. [ Europa ])
    this.infoPanel.onSelectMoonCallback = (moonId) => {
      this.interactionManager.selectObjectById(moonId);
    };

    // InfoPanel Parent Planet Badge Clicked (e.g. [ <- Earth ])
    this.infoPanel.onSelectParentPlanetCallback = (planetId) => {
      this.interactionManager.selectObjectById(planetId);
    };

    // Satellite Map Opening Callback from Info Panel
    this.infoPanel.onOpenSatelliteMapCallback = (data) => {
      const lat = (data && data.lat !== undefined) ? data.lat : DistanceService.userLocation.lat;
      const lon = (data && data.lon !== undefined) ? data.lon : DistanceService.userLocation.lon;
      const label = (data && data.name) ? data.name : 'Your Live Location';
      this.satelliteMapViewer.open(lat, lon, 18, label);
    };

    // Double-Click Raycast Callback (Double-clicking live location or Earth zooms down to house-level map)
    this.interactionManager.onDoubleClickCallback = (data, mesh, hitPoint) => {
      if (data.type === 'user_location' || data.id === 'user-location') {
        const lat = data.lat || DistanceService.userLocation.lat;
        const lon = data.lon || DistanceService.userLocation.lon;
        this.satelliteMapViewer.open(lat, lon, 18, 'Your Live Location');
      } else if (data.id === 'earth' || data.type === 'earth_surface' || (data.parentPlanetId === 'earth' && data.type !== 'satellite')) {
        let lat = data.lat;
        let lon = data.lon;
        let label = data.name || 'Earth Surface';
        if (lat === undefined || lon === undefined) {
          if (hitPoint && mesh && this.earthFMManager) {
            const coords = this.earthFMManager.convertPointToLatLon(mesh, hitPoint);
            lat = coords.latitude;
            lon = coords.longitude;
            label = `Surface: ${Math.abs(lat).toFixed(2)}°${lat >= 0 ? 'N' : 'S'}, ${Math.abs(lon).toFixed(2)}°${lon >= 0 ? 'E' : 'W'}`;
          } else {
            lat = DistanceService.userLocation.lat;
            lon = DistanceService.userLocation.lon;
          }
        }
        this.satelliteMapViewer.open(lat, lon, 18, label);
      }
    };

    // Focus Target Button Clicked
    const handleFocus = () => {
      if (this.interactionManager.selectedMesh) {
        const mesh = this.interactionManager.selectedMesh;
        const data = this.interactionManager.selectedData || mesh.userData;
        this.cameraAnimator.focusOnObject(mesh, data);
      }
    };
    this.infoPanel.onFocusCallback = handleFocus;
    this.uiOverlay.onFocusCallback = handleFocus;

    // Reset View Function (Triggered by Reset View UI Button, R key, or Escape key)
    const handleReset = () => {
      if (this.earthFMManager && this.earthFMManager.earthFMMode) {
        this.earthFMManager.exitEarthFM();
      }
      this.interactionManager.deselect();
      this.infoPanel.hide();
      this.helpModal.hide();
      this.topNav.updateBreadcrumb(null);
      this.planetFactory.setActiveFocusParent(null);
      this.cameraAnimator.resetToOverview();
    };
    this.infoPanel.onResetCallback = handleReset;
    this.topNav.onResetCallback = handleReset;
    this.uiOverlay.onResetCallback = handleReset;
    this.controlsManager.onResetShortcut = handleReset;
    this.controlsManager.onEscapeShortcut = handleReset;

    // Window Resize Handler
    window.addEventListener('resize', () => {
      this.sceneManager.onWindowResize();
    });

    // Keyboard Shortcuts: 'R' key or 'Escape' key to Reset View, 'Space' to Pause/Resume
    window.addEventListener('keydown', (e) => {
      if (e.key === 'r' || e.key === 'R' || e.key === 'Escape') {
        handleReset();
      } else if (e.code === 'Space') {
        e.preventDefault();
        this.toggleSimulationPause();
      }
    });
  }

  toggleSimulationPause() {
    if (this.simControls) {
      if (this.timeMultiplier > 0) {
        this.simControls.setSpeed(0);
      } else {
        this.simControls.setSpeed(1);
      }
    }
  }

  animate() {
    requestAnimationFrame(() => this.animate());

    const delta = this.clock.getDelta();

    // Update Sun Shaders & Scale Lerp
    this.sun.update(delta);

    // Update Planet, Moon & Artificial Spacecraft Orbital Physics
    this.planetFactory.update(delta, this.timeMultiplier);

    // Update 3D Live Location Marker on Earth Globe
    if (this.liveLocationMarker) {
      this.liveLocationMarker.update(delta);
    }

    // Update Hover & Selection System
    this.interactionManager.update(delta);

    // Update Camera Lerp Transitions & Orbital Focus Tracking
    this.cameraAnimator.update(delta);

    // Auto-transition to real satellite map when camera zooms very close to Earth surface
    const canAutoTrigger = (Date.now() - this.lastSatelliteMapCloseTime) > 3000;
    if (this.satelliteMapViewer && !this.satelliteMapViewer.isOpen && canAutoTrigger && !this.cameraAnimator.isFocusing) {
      const earthObj = this.planetFactory.planets.find(p => p.config.id === 'earth');
      if (earthObj && earthObj.planetMesh) {
        const earthPos = new THREE.Vector3();
        earthObj.planetMesh.getWorldPosition(earthPos);
        const dist = this.sceneManager.camera.position.distanceTo(earthPos);
        // Earth radius is 2.2; when zooming in close (< 2.68 units), smoothly open the satellite map
        if (dist < 2.68) {
          let lat = DistanceService.userLocation.lat;
          let lon = DistanceService.userLocation.lon;
          let label = 'Earth Surface Reconnaissance';

          if (this.earthFMManager) {
            const raycaster = new THREE.Raycaster();
            raycaster.setFromCamera(new THREE.Vector2(0, 0), this.sceneManager.camera);
            const hits = raycaster.intersectObject(earthObj.planetMesh, true);
            if (hits.length > 0) {
              const coords = this.earthFMManager.convertPointToLatLon(earthObj.planetMesh, hits[0].point);
              lat = coords.latitude;
              lon = coords.longitude;
              label = `Surface: ${Math.abs(lat).toFixed(2)}°${lat >= 0 ? 'N' : 'S'}, ${Math.abs(lon).toFixed(2)}°${lon >= 0 ? 'E' : 'W'}`;
            }
          }

          this.satelliteMapViewer.open(lat, lon, 18, label);
        }
      }
    }

    // Update Camera Flight Controls Damping
    this.controlsManager.update(delta);

    // Render 3D & CSS2D Scenes via EffectComposer
    this.sceneManager.render();
  }
}

// Launch Application on DOM Load
window.addEventListener('DOMContentLoaded', () => {
  new Application();
});
