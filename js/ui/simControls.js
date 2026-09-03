/**
 * Simulation Control Bar Component (Time Speed, Display Toggles & Layer Controls)
 */
export class SimControls {
  constructor(onTimeSpeedChange, onToggleOrbits, onToggleLabels, onToggleLayer, onToggleVisualSim) {
    this.onTimeSpeedChange = onTimeSpeedChange;
    this.onToggleOrbits = onToggleOrbits;
    this.onToggleLabels = onToggleLabels;
    this.onToggleLayer = onToggleLayer;
    this.onToggleVisualSim = onToggleVisualSim;

    this.speed = 1.0;
    this.orbitsVisible = true;
    this.labelsVisible = true;
    this.visualSimEnabled = true;

    this.init();
  }

  init() {
    // Motion Simulation Toggle Switch
    const toggleVisualSim = document.getElementById('toggle-visual-simulation');
    if (toggleVisualSim) {
      toggleVisualSim.addEventListener('change', (e) => {
        this.visualSimEnabled = e.target.checked;
        if (this.onToggleVisualSim) this.onToggleVisualSim(this.visualSimEnabled);
      });
    }

    // Time Speed buttons
    const speedButtons = document.querySelectorAll('.speed-btn');
    speedButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        speedButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        const speedVal = parseFloat(btn.getAttribute('data-speed'));
        this.speed = speedVal;
        if (this.onTimeSpeedChange) this.onTimeSpeedChange(this.speed);
      });
    });

    // Display Toggles
    const toggleOrbits = document.getElementById('toggle-orbit-paths');
    if (toggleOrbits) {
      toggleOrbits.addEventListener('change', (e) => {
        this.orbitsVisible = e.target.checked;
        if (this.onToggleOrbits) this.onToggleOrbits(this.orbitsVisible);
      });
    }

    const toggleLabels = document.getElementById('toggle-planet-labels');
    if (toggleLabels) {
      toggleLabels.addEventListener('change', (e) => {
        this.labelsVisible = e.target.checked;
        if (this.onToggleLabels) this.onToggleLabels(this.labelsVisible);
      });
    }

    // Layer Checkboxes
    const layerCheckboxes = document.querySelectorAll('.layer-checkbox');
    layerCheckboxes.forEach(cb => {
      cb.addEventListener('change', (e) => {
        const layerName = cb.getAttribute('data-layer');
        if (this.onToggleLayer) this.onToggleLayer(layerName, e.target.checked);
      });
    });
  }

  setSpeed(speedVal) {
    this.speed = speedVal;
    const speedButtons = document.querySelectorAll('.speed-btn');
    speedButtons.forEach(btn => {
      if (parseFloat(btn.getAttribute('data-speed')) === speedVal) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
    if (this.onTimeSpeedChange) this.onTimeSpeedChange(this.speed);
  }
}
