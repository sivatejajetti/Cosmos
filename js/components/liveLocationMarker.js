import * as THREE from 'three';
import { DistanceService } from '../services/distanceService.js';

/**
 * 3D Live Location Marker & Holographic Beacon on Earth Globe
 * Features:
 * - Real-time surface anchoring that rotates with Earth's axial spin
 * - Pulsating radar sonar rings on Earth's terrain
 * - Holographic beacon light pillar with luminous core & rotating diamond
 * - Billboard HUD sprite showing coordinates and 'YOU ARE HERE'
 * - Raycasting interactivity & click-to-focus
 */
export class LiveLocationMarker {
  constructor(earthMesh, scene, interactionManager) {
    this.earthMesh = earthMesh;
    this.scene = scene;
    this.interactionManager = interactionManager;

    this.markerGroup = new THREE.Group();
    this.markerGroup.name = 'user-live-location-marker';

    this.currentLat = 20.5937;
    this.currentLon = 78.9629;
    this.city = 'India';

    this.rippleTime = 0;
    this.radarRings = [];
    this.labelSprite = null;

    this.init();
  }

  init() {
    if (!this.earthMesh) return;

    // 1. Radar Surface Ripple Rings (flat on terrain)
    const ringMat1 = new THREE.MeshBasicMaterial({
      color: 0x10b981,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.85,
      depthWrite: false
    });
    const ringGeo1 = new THREE.RingGeometry(0.03, 0.08, 32);
    this.ring1 = new THREE.Mesh(ringGeo1, ringMat1);
    this.ring1.rotation.x = Math.PI / 2;
    this.ring1.position.y = 0.008; // slightly above sphere
    this.markerGroup.add(this.ring1);
    this.radarRings.push({ mesh: this.ring1, offset: 0 });

    const ringMat2 = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.7,
      depthWrite: false
    });
    const ringGeo2 = new THREE.RingGeometry(0.04, 0.09, 32);
    this.ring2 = new THREE.Mesh(ringGeo2, ringMat2);
    this.ring2.rotation.x = Math.PI / 2;
    this.ring2.position.y = 0.009;
    this.markerGroup.add(this.ring2);
    this.radarRings.push({ mesh: this.ring2, offset: 0.5 });

    // 2. Vertical Glowing Holographic Beam (Cylinder)
    const beamHeight = 0.38;
    const beamGeo = new THREE.CylinderGeometry(0.008, 0.016, beamHeight, 16, 1, true);
    const beamMat = new THREE.MeshBasicMaterial({
      color: 0x00f0ff,
      transparent: true,
      opacity: 0.65,
      side: THREE.DoubleSide,
      depthWrite: false
    });
    this.beam = new THREE.Mesh(beamGeo, beamMat);
    this.beam.position.y = beamHeight / 2;
    this.markerGroup.add(this.beam);

    // 3. Central Luminous Pin Core
    const coreGeo = new THREE.SphereGeometry(0.045, 16, 16);
    const coreMat = new THREE.MeshBasicMaterial({
      color: 0xffffff
    });
    this.core = new THREE.Mesh(coreGeo, coreMat);
    this.core.position.y = beamHeight;
    this.markerGroup.add(this.core);

    // Halo around core
    const haloGeo = new THREE.SphereGeometry(0.08, 16, 16);
    const haloMat = new THREE.MeshBasicMaterial({
      color: 0x22c55e,
      transparent: true,
      opacity: 0.6,
      depthWrite: false
    });
    this.halo = new THREE.Mesh(haloGeo, haloMat);
    this.halo.position.y = beamHeight;
    this.markerGroup.add(this.halo);

    // 4. Rotating Holographic Diamond
    const diamondGeo = new THREE.OctahedronGeometry(0.065, 0);
    const diamondMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      wireframe: true,
      transparent: true,
      opacity: 0.9
    });
    this.diamond = new THREE.Mesh(diamondGeo, diamondMat);
    this.diamond.position.y = beamHeight;
    this.markerGroup.add(this.diamond);

    // 5. Billboard Label Sprite
    this.labelSprite = this.createLabelSprite(this.currentLat, this.currentLon);
    this.labelSprite.position.y = beamHeight + 0.16;
    this.markerGroup.add(this.labelSprite);

    // 6. Generous Clickable Hit Target Sphere for easy interaction & double-click from space orbit
    const hitGeo = new THREE.SphereGeometry(0.35, 12, 12);
    const hitMat = new THREE.MeshBasicMaterial({ visible: false });
    this.hitBox = new THREE.Mesh(hitGeo, hitMat);
    this.hitBox.position.y = beamHeight / 2;
    this.markerGroup.add(this.hitBox);

    // Attach to Earth mesh so it rotates seamlessly with Earth's surface
    this.earthMesh.add(this.markerGroup);

    // Register with InteractionManager
    this.registerInteractiveTargets();

    // Subscribe to live Geolocation updates from DistanceService
    DistanceService.addListener((loc) => {
      if (loc && typeof loc.lat === 'number' && typeof loc.lon === 'number') {
        this.updateLocation(loc.lat, loc.lon, loc.city);
      }
    });
  }

  createLabelSprite(lat, lon) {
    const canvas = document.createElement('canvas');
    canvas.width = 440;
    canvas.height = 110;
    const ctx = canvas.getContext('2d');

    const latStr = `${Math.abs(lat).toFixed(2)}° ${lat >= 0 ? 'N' : 'S'}`;
    const lonStr = `${Math.abs(lon).toFixed(2)}° ${lon >= 0 ? 'E' : 'W'}`;

    // Rounded glowing glass card
    const x = 6, y = 6, w = 428, h = 98, r = 16;
    ctx.fillStyle = 'rgba(6, 12, 26, 0.88)';
    ctx.strokeStyle = 'rgba(34, 197, 94, 0.8)';
    ctx.lineWidth = 3;

    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Live Indicator Dot
    ctx.fillStyle = '#22c55e';
    ctx.beginPath();
    ctx.arc(36, 40, 9, 0, Math.PI * 2);
    ctx.fill();

    // Text Header
    ctx.font = 'bold 26px "Space Grotesk", sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText('📍 YOU ARE HERE', 56, 40);

    // Coordinates Subtitle
    ctx.font = '500 18px "Outfit", sans-serif';
    ctx.fillStyle = '#38bdf8';
    ctx.fillText(`LIVE GPS • ${latStr}, ${lonStr}`, 56, 75);

    const texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.LinearFilter;
    const spriteMat = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      depthTest: true
    });

    const sprite = new THREE.Sprite(spriteMat);
    const spriteScaleY = 0.42;
    const spriteScaleX = spriteScaleY * (440 / 110);
    sprite.scale.set(spriteScaleX, spriteScaleY, 1);

    return sprite;
  }

  updateLocation(lat, lon, city = '') {
    this.currentLat = lat;
    this.currentLon = lon;
    if (city) this.city = city;

    const earthRadius = (this.earthMesh.geometry?.parameters?.radius) || 2.2;
    const phi = (lat * Math.PI) / 180;
    const theta = ((lon + 180) * Math.PI) / 180;
    const r = earthRadius;

    const x = -r * Math.cos(phi) * Math.cos(theta);
    const y = r * Math.sin(phi);
    const z = r * Math.cos(phi) * Math.sin(theta);
    const surfacePos = new THREE.Vector3(x, y, z);
    const normal = surfacePos.clone().normalize();

    this.markerGroup.position.copy(surfacePos);
    this.markerGroup.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), normal);

    // Recreate label sprite with fresh coordinates
    if (this.labelSprite) {
      this.markerGroup.remove(this.labelSprite);
      if (this.labelSprite.material.map) this.labelSprite.material.map.dispose();
      this.labelSprite.material.dispose();
    }
    this.labelSprite = this.createLabelSprite(lat, lon);
    this.labelSprite.position.y = 0.38 + 0.16;
    this.markerGroup.add(this.labelSprite);

    this.registerInteractiveTargets();
  }

  registerInteractiveTargets() {
    if (!this.interactionManager) return;

    const targetData = {
      id: 'user-location',
      name: 'Your Live Location',
      type: 'user_location',
      category: 'location',
      lat: this.currentLat,
      lon: this.currentLon,
      city: this.city,
      radius: 0.25,
      description: `Your live geographic observer station on Earth located at ${Math.abs(this.currentLat).toFixed(2)}° ${this.currentLat >= 0 ? 'N' : 'S'}, ${Math.abs(this.currentLon).toFixed(2)}° ${this.currentLon >= 0 ? 'E' : 'W'}.`
    };

    if (this.hitBox) {
      this.interactionManager.registerTarget(this.hitBox, targetData);
    }
    if (this.core) {
      this.interactionManager.registerTarget(this.core, targetData);
    }
    if (this.diamond) {
      this.interactionManager.registerTarget(this.diamond, targetData);
    }
    if (this.labelSprite) {
      this.interactionManager.registerTarget(this.labelSprite, targetData);
    }
  }

  update(delta) {
    this.rippleTime += delta * 1.5;

    // Pulse Sonar Rings
    this.radarRings.forEach(item => {
      const progress = (this.rippleTime + item.offset) % 1.0;
      const scale = 0.6 + progress * 2.2;
      item.mesh.scale.set(scale, scale, 1);
      item.mesh.material.opacity = Math.max(0, (1 - progress) * 0.9);
    });

    // Rotate Diamond Halo
    if (this.diamond) {
      this.diamond.rotation.y += delta * 1.8;
      this.diamond.rotation.x += delta * 0.9;
    }

    // Core glow pulsation
    if (this.halo) {
      const pulse = 0.85 + Math.sin(this.rippleTime * 4) * 0.25;
      this.halo.scale.set(pulse, pulse, pulse);
    }
  }
}
