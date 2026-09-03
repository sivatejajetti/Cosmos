import * as THREE from 'three';
import { ARTIFICIAL_SATELLITES_DATA } from '../config/artificialSatellitesData.js';
import { getLiveOrbitAngle } from '../config/planetsData.js';

/**
 * Factory & Controller for 3D Artificial Satellites & Spacecraft (Segment 4)
 * Satellite names & spacecraft orbits appear ONLY when parent planet is focused.
 */
export class ArtificialSatelliteFactory {
  constructor(scene) {
    this.scene = scene;
    this.spacecraftList = [];
    this.activeParentId = null; // null = overview mode (hide spacecraft orbits & labels)
    this.layerVisibility = {
      moons: true,
      pioneers: true,
      'earth-sats': true,
      'deep-space': true,
      constellations: true
    };
    this.orbitsVisible = true;
    this.labelsVisible = true;
    this.visualSimulationMode = true;
  }

  setVisualSimulationMode(enabled) {
    this.visualSimulationMode = enabled;
  }

  createSpacecraftForParent(parentConfig, parentContainer) {
    const satConfigs = ARTIFICIAL_SATELLITES_DATA.filter(s => s.parentBodyId === parentConfig.id);
    const createdSats = [];

    satConfigs.forEach(config => {
      const satData = this.createSpacecraft(config, parentContainer);
      this.spacecraftList.push(satData);
      createdSats.push(satData);
    });

    return createdSats;
  }

  createSpacecraftModel(template, colorHex = 0x38bdf8) {
    const group = new THREE.Group();
    group.name = 'satellite-dot-group';

    // 1. Core bright white dot (Compact radius 0.07)
    const dotGeo = new THREE.SphereGeometry(0.07, 12, 12);
    const dotMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const dotMesh = new THREE.Mesh(dotGeo, dotMat);
    group.add(dotMesh);

    // 2. Outer glowing halo dot (Compact radius 0.16)
    const haloGeo = new THREE.SphereGeometry(0.16, 12, 12);
    const haloMat = new THREE.MeshBasicMaterial({
      color: colorHex,
      transparent: true,
      opacity: 0.75,
      depthWrite: false
    });
    const haloMesh = new THREE.Mesh(haloGeo, haloMat);
    group.add(haloMesh);

    // 3. Equatorial target ring dot (Compact radius 0.18–0.23)
    const ringGeo = new THREE.RingGeometry(0.18, 0.23, 16);
    const ringMat = new THREE.MeshBasicMaterial({
      color: colorHex,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.85
    });
    const ringMesh = new THREE.Mesh(ringGeo, ringMat);
    ringMesh.rotation.x = Math.PI / 2;
    group.add(ringMesh);

    return group;
  }

  createSpacecraftLabelSprite(name, launchYear, countryAgency) {
    const canvas = document.createElement('canvas');
    canvas.width = 384;
    canvas.height = 96;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = 'rgba(8, 15, 30, 0.88)';
    ctx.strokeStyle = 'rgba(251, 191, 36, 0.6)';
    ctx.lineWidth = 3;
    
    const r = 10;
    const x = 8, y = 8, w = 368, h = 80;
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#fbbf24';
    ctx.beginPath();
    ctx.arc(38, 48, 6, 0, Math.PI * 2);
    ctx.fill();

    ctx.font = 'bold 24px "Space Grotesk", sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(name.toUpperCase(), 58, 24);

    ctx.font = '500 16px "Outfit", sans-serif';
    ctx.fillStyle = '#fbbf24';
    ctx.fillText(`${launchYear} \u2022 ${countryAgency}`, 58, 54);

    const texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.LinearFilter;
    const spriteMat = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      depthTest: true
    });

    const sprite = new THREE.Sprite(spriteMat);
    const spriteScaleY = 1.3;
    const spriteScaleX = spriteScaleY * (384 / 96);
    sprite.scale.set(spriteScaleX, spriteScaleY, 1);
    sprite.position.set(0, 1.2, 0);

    return sprite;
  }

  createSpacecraft(config, parentContainer) {
    const pivot = new THREE.Group();
    pivot.name = `${config.id}-pivot`;

    const satContainer = new THREE.Group();
    satContainer.position.set(config.orbitalDistance, 0, 0);

    const modelMesh = this.createSpacecraftModel(config.visualTemplate, config.color);
    modelMesh.name = config.id;
    modelMesh.scale.setScalar(1.0);

    modelMesh.userData = {
      id: config.id,
      name: config.name,
      parentBodyId: config.parentBodyId,
      radius: 0.8,
      type: 'artificial',
      ...config
    };

    satContainer.add(modelMesh);

    // Label Sprite (Initially hidden in overview mode)
    const labelSprite = this.createSpacecraftLabelSprite(config.name, config.launchYear, config.countryAgency);
    labelSprite.visible = false;
    satContainer.add(labelSprite);

    pivot.add(satContainer);
    parentContainer.add(pivot);

    // Orbit Line (Initially hidden in overview mode)
    const orbitLine = this.createOrbitLine(config.orbitalDistance, config.color);
    orbitLine.visible = false;
    parentContainer.add(orbitLine);

    return {
      config,
      pivot,
      satContainer,
      modelMesh,
      labelSprite,
      orbitLine,
      orbitAngle: Math.random() * Math.PI * 2
    };
  }

  createOrbitLine(radius, colorHex = 0xfbbf24) {
    const points = [];
    const segments = 128;
    for (let i = 0; i <= segments; i++) {
      const theta = (i / segments) * Math.PI * 2;
      points.push(new THREE.Vector3(Math.cos(theta) * radius, 0, Math.sin(theta) * radius));
    }

    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.LineDashedMaterial({
      color: colorHex,
      transparent: true,
      opacity: 0.35,
      dashSize: 0.8,
      gapSize: 0.5
    });

    const line = new THREE.LineLoop(geometry, material);
    line.computeLineDistances();
    return line;
  }

  setActiveParentId(parentId) {
    this.activeParentId = parentId;
    this.spacecraftList.forEach(s => {
      const isParentActive = Boolean(parentId) && (s.config.parentBodyId === parentId);
      const isLayerVisible = this.layerVisibility[s.config.layer] !== false;
      
      s.labelSprite.visible = isParentActive && isLayerVisible && this.labelsVisible;
      s.orbitLine.visible = isParentActive && isLayerVisible && this.orbitsVisible;
    });
  }

  setLayerVisible(layerName, visible) {
    this.layerVisibility[layerName] = visible;
    this.setActiveParentId(this.activeParentId);
  }

  setOrbitPathsVisible(visible) {
    this.orbitsVisible = visible;
    this.setActiveParentId(this.activeParentId);
  }

  setLabelsVisible(visible) {
    this.labelsVisible = visible;
    this.setActiveParentId(this.activeParentId);
  }

  update(delta, timeSpeed = 1.0) {
    const timeFactor = delta * 60 * timeSpeed;
    const now = new Date();

    this.spacecraftList.forEach(s => {
      const isLayerVisible = this.layerVisibility[s.config.layer] !== false;
      if (!isLayerVisible) return;

      if (this.visualSimulationMode) {
        // Visual Motion Simulation Mode: active fluid orbital motion for satellite dots
        s.orbitAngle += (s.config.orbitSpeed || 1.0) * 0.018 * timeFactor;
      } else if (timeSpeed === 1.0) {
        // 1:1 Astronomical Real-Time Clock Mode
        s.orbitAngle = getLiveOrbitAngle(s.config, now);
      } else {
        // Accelerated simulation time mode
        s.orbitAngle += (s.config.orbitSpeed || 1.0) * 0.012 * timeFactor;
      }

      s.satContainer.position.x = Math.cos(s.orbitAngle) * s.config.orbitalDistance;
      s.satContainer.position.z = Math.sin(s.orbitAngle) * s.config.orbitalDistance;

      s.modelMesh.rotation.y += (s.config.rotationSpeed || 0.01) * timeFactor;
    });
  }
}
