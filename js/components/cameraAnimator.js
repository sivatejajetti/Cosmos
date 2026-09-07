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
   * Focus camera smoothly on a celestial object mesh (planet, moon, or spacecraft)
   */
  focusOnObject(mesh, radiusOrConfig) {
    this.targetMesh = mesh;
    this.isEarthFMZoom = false;

    let radius = 1.5;
    let type = 'planet';
    let category = null;

    if (typeof radiusOrConfig === 'number') {
      radius = radiusOrConfig;
    } else if (radiusOrConfig && typeof radiusOrConfig === 'object') {
      radius = radiusOrConfig.radius || (mesh.userData && mesh.userData.radius) || 1.5;
      type = radiusOrConfig.type || (mesh.userData && mesh.userData.type) || 'planet';
      category = radiusOrConfig.category || (mesh.userData && mesh.userData.category) || null;
    }

    this.targetRadius = radius;
    this.targetType = type;
    this.targetCategory = category;

    this.isFocusing = true;
    this.isResetting = false;
  }

  /**
   * Focus camera smoothly close-up on Earth for Earth FM mode
   */
  focusEarthFM(mesh) {
    this.targetMesh = mesh;
    this.targetRadius = 2.2;
    this.targetType = 'planet';
    this.targetCategory = null;
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

      // Optimal viewing offset based on object type & radius
      let offsetDist;
      if (this.isEarthFMZoom) {
        offsetDist = 5.2;
      } else if (this.targetCategory === 'artificial' || this.targetType === 'spacecraft' || this.targetRadius < 0.3) {
        // Spacecraft / Artificial Satellites: Close-up zoom (1.8 to 3.0 units)
        offsetDist = Math.max(1.8, this.targetRadius * 6.0 + 1.5);
      } else if (this.targetType === 'satellite' || this.targetRadius < 1.0) {
        // Natural Satellites / Moons: Close-up zoom (3.5 to 6.0 units)
        offsetDist = Math.max(3.5, this.targetRadius * 4.0 + 2.2);
      } else {
        // Planets & Sun: Overview framing (18 to 35 units)
        offsetDist = Math.max(18, this.targetRadius * 3.4 + 10);
      }
      
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
