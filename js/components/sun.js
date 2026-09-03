import * as THREE from 'three';
import { SUN_CONFIG } from '../config/planetsData.js';
import { TextureManager } from '../services/textureManager.js';
import { TextureGenerator } from './textureGen.js';
import { Shaders } from './shaders.js';

/**
 * Sun Object with Animated Solar Plasma Shader, Crisp Corona Glow & Scale Transition Support
 */
export class Sun {
  constructor(scene) {
    this.scene = scene;
    this.config = SUN_CONFIG;
    
    this.targetScale = 1.0;
    this.currentScale = 1.0;
    
    this.init();
  }

  init() {
    this.group = new THREE.Group();
    this.group.name = 'sun-group';

    // 1. Sun Texture — loaded via TextureGenerator (sRGB configured inside)
    const sunTexture = TextureGenerator.getTexture('sun');
    this.sunMaterial = Shaders.createSunMaterial(sunTexture);

    // 2. Sun Sphere Mesh
    const geometry = new THREE.SphereGeometry(this.config.radius, 128, 128);
    this.mesh = new THREE.Mesh(geometry, this.sunMaterial);
    this.mesh.name = 'sun';
    this.mesh.userData = { id: 'sun', ...this.config, type: 'star' };
    this.group.add(this.mesh);

    // 3. Inner Corona Glow Mesh (Tight 1.04x scale)
    const glowGeometry = new THREE.SphereGeometry(this.config.radius * 1.04, 64, 64);
    const glowMaterial = Shaders.createAtmosphereMaterial(0xffbe3b, 5.5, 0.95);
    this.glowMesh = new THREE.Mesh(glowGeometry, glowMaterial);
    this.group.add(this.glowMesh);

    // 4. Secondary Soft Solar Haze (Tight 1.08x scale)
    const outerGlowGeo = new THREE.SphereGeometry(this.config.radius * 1.08, 32, 32);
    const outerGlowMat = Shaders.createAtmosphereMaterial(0xff9900, 6.5, 0.98);
    this.outerGlow = new THREE.Mesh(outerGlowGeo, outerGlowMat);
    this.group.add(this.outerGlow);

    this.scene.add(this.group);
  }

  setScaleMode(mode = 'visual') {
    if (mode === 'real') {
      this.targetScale = this.config.realRadius / this.config.radius; // ~15.5x scale
    } else {
      this.targetScale = 1.0;
    }
  }

  update(delta) {
    // Smooth Scale Lerp
    if (Math.abs(this.currentScale - this.targetScale) > 0.001) {
      this.currentScale += (this.targetScale - this.currentScale) * 3.0 * delta;
      this.group.scale.setScalar(this.currentScale);
    }

    // Animate solar plasma surface shader time uniform
    if (this.sunMaterial && this.sunMaterial.uniforms.time) {
      this.sunMaterial.uniforms.time.value += delta;
    }

    // Slow rotation
    if (this.mesh) {
      this.mesh.rotation.y += 0.002 * delta * 60;
    }
  }
}
