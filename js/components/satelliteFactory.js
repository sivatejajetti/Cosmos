import * as THREE from 'three';
import { SATELLITES_DATA } from '../config/satellitesData.js';
import { TextureGenerator } from './textureGen.js';
import { TextureManager } from '../services/textureManager.js';
import { getLiveOrbitAngle } from '../config/planetsData.js';

/**
 * Factory & Controller for 3D Natural Satellites (Moons)
 * Satellite names & satellite orbits appear ONLY when parent planet is focused.
 */
export class SatelliteFactory {
  constructor(scene) {
    this.scene = scene;
    this.satellites = [];
    this.activeParentId = null; // null = overview mode (hide satellite orbits & labels)
    this.orbitsVisible = true;
    this.labelsVisible = true;
    this.visualSimulationMode = true;
  }

  setVisualSimulationMode(enabled) {
    this.visualSimulationMode = enabled;
  }

  createSatellitesForPlanet(planetConfig, planetContainer) {
    const moonConfigs = SATELLITES_DATA.filter(s => s.parentPlanetId === planetConfig.id);
    const createdMoons = [];

    moonConfigs.forEach(config => {
      const moonData = this.createSatellite(config, planetContainer);
      this.satellites.push(moonData);
      createdMoons.push(moonData);
    });

    return createdMoons;
  }

  createMoonLabelSprite(name) {
    const canvas = document.createElement('canvas');
    canvas.width = 384;
    canvas.height = 96;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = 'rgba(8, 15, 30, 0.85)';
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.5)';
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

    ctx.fillStyle = '#e2e8f0';
    ctx.font = 'bold 26px "Space Grotesk", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`🌙 ${name.toUpperCase()}`, 192, 48);

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
    sprite.position.set(0, 1.4, 0);

    return sprite;
  }

  createSatellite(config, planetContainer) {
    const pivot = new THREE.Group();
    pivot.name = `${config.id}-pivot`;

    const satelliteContainer = new THREE.Group();
    satelliteContainer.position.set(config.orbitalDistance, 0, 0);

    const geometry = new THREE.SphereGeometry(config.radius, 32, 32);
    const texture = TextureManager.getTexture(config.textureType || 'moon');

    const material = new THREE.MeshStandardMaterial({
      map: texture,
      roughness: 0.8,
      metalness: 0.05
    });

    const moonMesh = new THREE.Mesh(geometry, material);
    moonMesh.name = config.id;
    moonMesh.castShadow = true;
    moonMesh.receiveShadow = true;

    moonMesh.userData = {
      id: config.id,
      name: config.name,
      parentPlanetId: config.parentPlanetId,
      radius: config.radius,
      type: 'satellite',
      ...config
    };

    satelliteContainer.add(moonMesh);

    // Label Sprite (Initially hidden in overview mode)
    const labelSprite = this.createMoonLabelSprite(config.name);
    labelSprite.visible = false;
    satelliteContainer.add(labelSprite);

    pivot.add(satelliteContainer);
    planetContainer.add(pivot);

    // Dotted Moon Orbit Line (Initially hidden in overview mode)
    const orbitLine = this.createOrbitLine(config.orbitalDistance, config.color);
    orbitLine.visible = false;
    planetContainer.add(orbitLine);

    return {
      config,
      pivot,
      satelliteContainer,
      moonMesh,
      labelSprite,
      orbitLine,
      orbitAngle: getLiveOrbitAngle(config, new Date())
    };
  }

  createOrbitLine(radius, colorHex = 0x64748b) {
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
      opacity: 0.4,
      dashSize: 0.6,
      gapSize: 0.4
    });

    const line = new THREE.LineLoop(geometry, material);
    line.computeLineDistances();
    return line;
  }

  setActiveParentId(parentId) {
    this.activeParentId = parentId;
    this.satellites.forEach(s => {
      const isParentActive = Boolean(parentId) && (s.config.parentPlanetId === parentId);
      s.labelSprite.visible = isParentActive && this.labelsVisible;
      s.orbitLine.visible = isParentActive && this.orbitsVisible;
    });
  }

  setMoonOrbitPathsVisible(visible) {
    this.orbitsVisible = visible;
    this.setActiveParentId(this.activeParentId);
  }

  setMoonLabelsVisible(visible) {
    this.labelsVisible = visible;
    this.setActiveParentId(this.activeParentId);
  }

  update(delta, timeSpeed = 1.0) {
    const timeFactor = delta * 60 * timeSpeed;
    const now = new Date();

    this.satellites.forEach(s => {
      if (this.visualSimulationMode) {
        // Visual Motion Simulation Mode: active fluid orbital motion for natural moons
        s.orbitAngle += (s.config.orbitSpeed || 1.0) * 0.014 * timeFactor;
      } else if (timeSpeed === 1.0) {
        // 1:1 Astronomical Real-Time Clock Mode
        s.orbitAngle = getLiveOrbitAngle(s.config, now);
      } else {
        // Accelerated simulation time mode
        s.orbitAngle += (s.config.orbitSpeed || 1.0) * 0.01 * timeFactor;
      }

      s.satelliteContainer.position.x = Math.cos(s.orbitAngle) * s.config.orbitalDistance;
      s.satelliteContainer.position.z = Math.sin(s.orbitAngle) * s.config.orbitalDistance;

      s.moonMesh.rotation.y += (s.config.rotationSpeed || 0.005) * timeFactor;
    });
  }
}
