/**
 * Loading Screen Component for COSMOS
 */
export class LoadingScreen {
  constructor(onComplete) {
    this.onComplete = onComplete;
    this.container = document.getElementById('loading-screen');
    this.progressBar = document.getElementById('loading-progress-bar');
    this.statusText = document.getElementById('loading-status-text');

    this.stages = [
      { progress: 25, text: 'Initializing WebGL 3D Renderer...' },
      { progress: 50, text: 'Generating 4K Procedural Textures...' },
      { progress: 75, text: 'Configuring Orbital Physics & Shaders...' },
      { progress: 100, text: 'Entering Solar System...' }
    ];

    this.start();
  }

  start() {
    let currentStage = 0;

    const interval = setInterval(() => {
      if (currentStage < this.stages.length) {
        const stage = this.stages[currentStage];
        if (this.progressBar) this.progressBar.style.width = `${stage.progress}%`;
        if (this.statusText) this.statusText.textContent = stage.text;
        currentStage++;
      } else {
        clearInterval(interval);
        setTimeout(() => this.finish(), 80);
      }
    }, 40);
  }

  finish() {
    if (this.container) {
      this.container.classList.add('fade-out');
      setTimeout(() => {
        this.container.style.display = 'none';
        if (this.onComplete) this.onComplete();
      }, 200);
    } else {
      if (this.onComplete) this.onComplete();
    }
  }
}
