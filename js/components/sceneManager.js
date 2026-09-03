import * as THREE from 'three';
import { CSS2DRenderer } from 'three/addons/renderers/CSS2DRenderer.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { TextureManager } from '../services/textureManager.js';

/**
 * Three.js Scene, Camera, WebGL, Shadow Maps & Post-Processing Bloom Manager
 * Tuned for crisp, non-bloated cinematic space visuals.
 */
export class SceneManager {
  constructor(containerElement) {
    this.container = containerElement;

    // 1. Create Scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x02050e);

    // 2. Perspective Camera Setup (Far plane 25,000)
    const fov = 45;
    const aspect = window.innerWidth / window.innerHeight;
    const near = 0.1;
    const far = 25000;
    this.camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
    this.camera.position.set(0, 110, 230);

    // 3. WebGL Renderer & PCF Soft Shadows Setup
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance'
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;
    
    // Enable PCF Soft Shadow Mapping
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // Set output color space so PBR textures (sRGB input) display correctly
    if (THREE.SRGBColorSpace !== undefined) {
      this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    }

    // Initialise TextureManager with renderer capabilities (max anisotropy)
    TextureManager.init(this.renderer);

    this.container.appendChild(this.renderer.domElement);

    // 4. CSS 2D Renderer for HTML Overlays
    this.labelRenderer = new CSS2DRenderer();
    this.labelRenderer.setSize(window.innerWidth, window.innerHeight);
    this.labelRenderer.domElement.style.position = 'absolute';
    this.labelRenderer.domElement.style.top = '0px';
    this.labelRenderer.domElement.style.left = '0px';
    this.labelRenderer.domElement.style.pointerEvents = 'none';
    this.container.appendChild(this.labelRenderer.domElement);

    // 5. Lighting Setup
    this.setupLighting();

    // 6. Post-Processing Pipeline (Unreal Bloom - Tuned for crispness)
    this.setupPostProcessing();

    // 7. Handle Window Resizing
    window.addEventListener('resize', () => this.onWindowResize());
  }

  setupLighting() {
    // Ambient light baseline
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.25);
    this.scene.add(ambientLight);

    // Sun Point Light casting real-time soft shadows
    this.sunLight = new THREE.PointLight(0xffffff, 2.5, 12000, 0.2);
    this.sunLight.position.set(0, 0, 0);
    this.sunLight.castShadow = true;
    this.sunLight.shadow.mapSize.width = 2048;
    this.sunLight.shadow.mapSize.height = 2048;
    this.sunLight.shadow.camera.near = 0.5;
    this.sunLight.shadow.camera.far = 12000;
    this.sunLight.shadow.bias = -0.0001;

    this.scene.add(this.sunLight);
  }

  setupPostProcessing() {
    this.composer = new EffectComposer(this.renderer);

    const renderPass = new RenderPass(this.scene, this.camera);
    this.composer.addPass(renderPass);

    // Cinematic Unreal Bloom Pass (Strength 0.4, Radius 0.4, Threshold 0.3 for crisp highlights)
    const resolution = new THREE.Vector2(window.innerWidth, window.innerHeight);
    this.bloomPass = new UnrealBloomPass(resolution, 0.4, 0.4, 0.3);
    this.composer.addPass(this.bloomPass);

    const outputPass = new OutputPass();
    this.composer.addPass(outputPass);
  }

  onWindowResize() {
    const width = window.innerWidth;
    const height = window.innerHeight;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();

    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    this.composer.setSize(width, height);
    this.labelRenderer.setSize(width, height);
  }

  render() {
    // Render WebGL via EffectComposer (Bloom + Tone Mapping)
    this.composer.render();
    // Render 2D Overlays
    this.labelRenderer.render(this.scene, this.camera);
  }
}
