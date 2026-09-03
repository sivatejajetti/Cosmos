import * as THREE from 'three';
import { PLANETS_DATA, getLiveOrbitAngle } from '../config/planetsData.js';
import { TextureGenerator } from './textureGen.js';
import { TextureManager } from '../services/textureManager.js';
import { Shaders } from './shaders.js';
import { SatelliteFactory } from './satelliteFactory.js';
import { ArtificialSatelliteFactory } from './artificialSatelliteFactory.js';

/**
 * Factory & Physics Controller for 3D Solar System Planets & Satellites
 * Planets move synchronously based on live system clock and Keplerian orbital mechanics.
 */
export class PlanetFactory {
  constructor(scene) {
    this.scene = scene;
    this.planets = [];
    this.labelsVisible = true;
    this.orbitsVisible = true;

    this.satelliteFactory = new SatelliteFactory(scene);
    this.artificialSatelliteFactory = new ArtificialSatelliteFactory(scene);

    this.init();
  }

  init() {
    PLANETS_DATA.forEach(config => {
      const planetData = this.createPlanet(config);
      this.planets.push(planetData);
    });
  }

  createPlanetLabelSprite(name) {
    const canvas = document.createElement('canvas');
    canvas.width = 384;
    canvas.height = 96;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = 'rgba(8, 15, 30, 0.85)';
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.6)';
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

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 28px "Space Grotesk", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(name.toUpperCase(), 192, 48);

    const texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.LinearFilter;
    const spriteMat = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      depthTest: true
    });

    const sprite = new THREE.Sprite(spriteMat);
    const spriteScaleY = 2.2;
    const spriteScaleX = spriteScaleY * (384 / 96);
    sprite.scale.set(spriteScaleX, spriteScaleY, 1);

    return sprite;
  }

  createPlanet(config) {
    const planetContainer = new THREE.Group();
    planetContainer.name = `${config.id}-container`;

    // Compute live initial orbital angle from current system date
    const initialOrbitAngle = getLiveOrbitAngle(config, new Date());

    const geometry = new THREE.SphereGeometry(config.radius, 64, 64);

    // Get texture through TextureManager for caching + sRGB colorSpace handling
    const texture = TextureManager.getTexture(config.textureType);

    // Per-planet material tuning — each planet gets its own independent instance
    const materialProps = { map: texture, roughness: 0.75, metalness: 0.05 };
    if (config.id === 'earth') {
      // Earth: slightly specular ocean reflections, lower roughness
      materialProps.roughness = 0.62;
      materialProps.metalness = 0.08;
    } else if (config.id === 'jupiter' || config.id === 'saturn') {
      // Gas giants: smooth cloud tops
      materialProps.roughness = 0.55;
      materialProps.metalness = 0.02;
    } else if (config.id === 'mercury') {
      // Mercury: highly cratered, rough rock
      materialProps.roughness = 0.90;
      materialProps.metalness = 0.0;
    }

    const material = new THREE.MeshStandardMaterial(materialProps);

    const planetMesh = new THREE.Mesh(geometry, material);
    planetMesh.name = config.id;
    planetMesh.castShadow = true;
    planetMesh.receiveShadow = true;

    if (config.axialTilt) {
      planetMesh.rotation.z = THREE.MathUtils.degToRad(config.axialTilt);
    }

    planetMesh.userData = {
      id: config.id,
      name: config.name,
      radius: config.radius,
      type: 'planet',
      ...config
    };

    planetContainer.add(planetMesh);

    // Atmospheric Fresnel Shader Layer
    // coefficient=0.70 means glow only appears at the very limb edge, not over the disc centre
    if (config.hasAtmosphere) {
      const atmosGeo = new THREE.SphereGeometry(config.radius * 1.035, 64, 64);
      const atmosMat = Shaders.createAtmosphereMaterial(
        config.atmosphereColor || config.color,
        4.5,   // power — higher = tighter edge glow
        0.70   // coefficient — lower = glow starts closer to silhouette
      );
      const atmosMesh = new THREE.Mesh(atmosGeo, atmosMat);
      atmosMesh.name = `${config.id}-atmosphere`;
      planetContainer.add(atmosMesh);
    }

    // Saturn Rings — independent material, ring UV remapped radially (0=inner, 1=outer)
    if (config.hasRings && config.ringConfig) {
      const { innerRadius, outerRadius, textureType: ringType } = config.ringConfig;
      const ringGeo = new THREE.RingGeometry(innerRadius, outerRadius, 128);
      const ringTex = TextureManager.getTexture(ringType);

      // Fix UV: Three.js RingGeometry uses angular UV by default;
      // remap v to be the radial fraction 0→1 from inner to outer edge
      const pos = ringGeo.attributes.position;
      const uv  = ringGeo.attributes.uv;
      for (let i = 0; i < pos.count; i++) {
        const px = pos.getX(i), py = pos.getY(i);
        const radial = (Math.sqrt(px * px + py * py) - innerRadius) / (outerRadius - innerRadius);
        uv.setXY(i, radial, 0.5); // u=radial fraction, v=constant row
      }
      uv.needsUpdate = true;

      const ringMat = new THREE.MeshBasicMaterial({
        map: ringTex,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.92,
        depthWrite: false,   // prevent ring from occluding planet surface
        alphaTest: 0.01
      });

      const ringMesh = new THREE.Mesh(ringGeo, ringMat);
      ringMesh.rotation.x = Math.PI / 2;
      ringMesh.name = `${config.id}-rings`;
      planetContainer.add(ringMesh);
    }

    // 3D HUD Label Sprite
    const labelSprite = this.createPlanetLabelSprite(config.name);
    labelSprite.position.set(0, config.radius + 3.2, 0);
    planetContainer.add(labelSprite);

    // Initial position on live orbit
    planetContainer.position.x = Math.cos(initialOrbitAngle) * config.distance;
    planetContainer.position.z = Math.sin(initialOrbitAngle) * config.distance;

    this.scene.add(planetContainer);

    // 3D Orbital Path Ring
    const orbitLine = this.createOrbitLine(config.distance, config.orbitColor || config.color);
    this.scene.add(orbitLine);

    // Create Natural Moons & Artificial Satellites attached to planet container
    const moons = this.satelliteFactory.createSatellitesForPlanet(config, planetContainer);
    const spacecraft = this.artificialSatelliteFactory.createSpacecraftForParent(config, planetContainer);

    return {
      config,
      planetContainer,
      planetMesh,
      labelSprite,
      orbitLine,
      moons,
      spacecraft,
      orbitAngle: initialOrbitAngle
    };
  }

  createOrbitLine(radius, colorHex) {
    const points = [];
    const segments = 256;
    for (let i = 0; i <= segments; i++) {
      const theta = (i / segments) * Math.PI * 2;
      points.push(new THREE.Vector3(Math.cos(theta) * radius, 0, Math.sin(theta) * radius));
    }

    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.LineBasicMaterial({
      color: colorHex,
      transparent: true,
      opacity: 0.4
    });

    return new THREE.Line(geometry, material);
  }

  setActiveFocusParent(parentId) {
    this.satelliteFactory.setActiveParentId(parentId);
    this.artificialSatelliteFactory.setActiveParentId(parentId);
  }

  setPlanetLabelsVisible(visible) {
    this.labelsVisible = visible;
    this.planets.forEach(p => {
      if (p.labelSprite) p.labelSprite.visible = visible;
    });
    this.satelliteFactory.setMoonLabelsVisible(visible);
    this.artificialSatelliteFactory.setLabelsVisible(visible);
  }

  setOrbitPathsVisible(visible) {
    this.orbitsVisible = visible;
    this.planets.forEach(p => {
      if (p.orbitLine) p.orbitLine.visible = visible;
    });
    this.satelliteFactory.setMoonOrbitPathsVisible(visible);
    this.artificialSatelliteFactory.setOrbitPathsVisible(visible);
  }

  update(delta, timeSpeed = 1.0) {
    const timeFactor = delta * 60 * timeSpeed;
    const now = new Date();

    this.planets.forEach(p => {
      if (timeSpeed === 1.0) {
        // Live astronomical time sync
        p.orbitAngle = getLiveOrbitAngle(p.config, now);
      } else {
        // Accelerated simulation time mode
        p.orbitAngle += p.config.orbitSpeed * 0.002 * timeFactor;
      }

      p.planetContainer.position.x = Math.cos(p.orbitAngle) * p.config.distance;
      p.planetContainer.position.z = Math.sin(p.orbitAngle) * p.config.distance;

      // Axial self rotation
      p.planetMesh.rotation.y += p.config.rotationSpeed * timeFactor;
    });

    // Update natural satellites & artificial spacecraft
    this.satelliteFactory.update(delta, timeSpeed);
    this.artificialSatelliteFactory.update(delta, timeSpeed);
  }
}
