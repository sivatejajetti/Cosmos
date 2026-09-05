import * as THREE from 'three';

/**
 * Camera Animator for Smooth Lerp Transitions & Dynamic Orbit Target Tracking
 */
export class CameraAnimator {
  constructor(camera, controlsManager) {
    this.camera = camera;
    this.controlsManager = controlsManager;
    this.controls = controlsManager.controls;

    this.targetMesh = null;
    this.targetRadius = 10;
    this.isFocusing = false;
    this.isResetting = false;

    // Overview default settings
    this.defaultCameraPos = new THREE.Vector3(0, 110, 230);
    this.defaultTargetPos = new THREE.Vector3(0, 0, 0);

    // Current interpolation goals
    this.goalCameraPos = new THREE.Vector3();
    this.goalTargetPos = new THREE.Vector3();

    this.lerpSpeed = 4.5; // Exponential interpolation speed
  }

  /**
   * Adjust default overview camera position depending on Real AU scale vs Visual scale
   */
  setOverviewForScaleMode(mode = 'visual') {
    if (mode === 'real') {
      this.defaultCameraPos.set(0, 1800, 3800);
    } else {
      this.defaultCameraPos.set(0, 110, 230);
    }
  }

  /**
   * Focus camera smoothly on a celestial object mesh
   */
  focusOnObject(mesh, radiusOrConfig) {
    this.targetMesh = mesh;
    this.isEarthFMZoom = false;
    if (typeof radiusOrConfig === 'number') {
      this.targetRadius = radiusOrConfig;
    } else if (radiusOrConfig && typeof radiusOrConfig.radius === 'number') {
      this.targetRadius = radiusOrConfig.radius;
    } else {
      this.targetRadius = 2.2;
    }
    this.isFocusing = true;
    this.isResetting = false;
  }

  /**
   * Focus camera smoothly close-up on Earth for Earth FM mode
   */
  focusEarthFM(mesh) {
    this.targetMesh = mesh;
    this.targetRadius = 2.2;
    this.isEarthFMZoom = true;
    this.isFocusing = true;
    this.isResetting = false;
  }

  /**
   * Reset camera smoothly back to overview position
   */
  resetToOverview() {
    this.targetMesh = null;
    this.isFocusing = false;
    this.isResetting = true;

    this.goalCameraPos.copy(this.defaultCameraPos);
    this.goalTargetPos.copy(this.defaultTargetPos);
  }

  /**
   * Main per-frame update loop
   */
  update(delta) {
    if (!this.isFocusing && !this.isResetting) return;

    const lerpFactor = Math.min(1.0, (1 - Math.exp(-this.lerpSpeed * delta)));

    if (this.isFocusing && this.targetMesh) {
      const worldPos = new THREE.Vector3();
      this.targetMesh.getWorldPosition(worldPos);

      this.goalTargetPos.copy(worldPos);

      // Optimal viewing offset based on radius
      // In Earth FM mode, zoom close so Earth fills the viewport (offsetDist = 5.2)
      const offsetDist = this.isEarthFMZoom ? 5.2 : Math.max(22, this.targetRadius * 3.4 + 10);
      
      const currentDir = new THREE.Vector3().subVectors(this.camera.position, this.controls.target);
      if (currentDir.lengthSq() < 0.1) currentDir.set(0, 1, 2);
      currentDir.normalize().multiplyScalar(offsetDist);

      this.goalCameraPos.copy(worldPos).add(currentDir);
    }

    // Lerp Camera Position & Controls Target
    this.camera.position.lerp(this.goalCameraPos, lerpFactor);
    this.controls.target.lerp(this.goalTargetPos, lerpFactor);
    this.controls.update();

    if (this.isResetting) {
      if (this.camera.position.distanceTo(this.goalCameraPos) < 2.0) {
        this.isResetting = false;
      }
    }
  }
}
