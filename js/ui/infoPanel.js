import { PLANETS_DATA } from '../config/planetsData.js';
import { SATELLITES_DATA } from '../config/satellitesData.js';
import { CosmosApi } from '../services/cosmosApi.js';

/**
 * Modular Tabbed Information Panel — Segment 7 AI Explanation Integration
 */
export class InfoPanel {
  constructor() {
    this.container = null;
    this.currentData = null;
    this.wikiData = null;
    this.wikiLoading = false;
    this.activeTab = 'overview';

    // AI State
    this.aiExplanation = null;
    this.aiLoading = false;
    this.aiError = null;
    this.aiMode = 'beginner';
    this.aiQuestion = null;
    this._aiRequested = false; // track if user explicitly clicked "Generate"

    this.onCloseCallback = null;
    this.onFocusCallback = null;
    this.onResetCallback = null;
    this.onSelectMoonCallback = null;
    this.onSelectParentPlanetCallback = null;

    this.init();
  }

  init() {
    this.container = document.createElement('div');
    this.container.className = 'info-panel-container hidden';
    document.body.appendChild(this.container);
  }

  show(data) {
    if (!data) return;
    this.currentData = data;
    this.wikiData = null;
    this.wikiLoading = true;
    this.activeTab = 'overview';

    // Reset AI state on new object selection
    this.aiExplanation = null;
    this.aiLoading = false;
    this.aiError = null;
    this.aiMode = 'beginner';
    this.aiQuestion = null;
    this._aiRequested = false;

    this.render();
    this.container.classList.remove('hidden');
    this.container.classList.add('visible');

    // Asynchronously fetch Wikipedia summary in background
    this.fetchWikipedia(data.id);
  }

  async fetchWikipedia(id) {
    const wiki = await CosmosApi.getWikipediaData(id);
    this.wikiData = wiki;
    this.wikiLoading = false;
    if (this.currentData && this.currentData.id === id) {
      this.render();
    }
  }

  async requestAIExplanation(id, mode, question) {
    this.aiLoading = true;
    this.aiExplanation = null;
    this.aiError = null;
    this._aiRequested = true;
    this.render();

    const result = await CosmosApi.getAIExplanation(id, mode, question || null);

    this.aiLoading = false;
    if (result && result.success && result.explanation) {
      this.aiExplanation = result.explanation;
      this.aiError = null;
    } else {
      this.aiExplanation = null;
      this.aiError = result?.error || 'AI explanation unavailable.';
    }

    if (this.currentData && this.currentData.id === id) {
      this.render();
    }
  }

  hide() {
    this.container.classList.remove('visible');
    this.container.classList.add('hidden');
  }

  render() {
    if (!this.currentData) return;

    const data = this.currentData;
    const isArtificial = data.category === 'artificial';
    const isMoon = data.type === 'satellite' || data.type === 'Natural Satellite' || data.type === 'Galilean Satellite';
    const parentId = isArtificial ? data.parentBodyId : (isMoon ? data.parentPlanetId : null);
    const parentPlanet = parentId ? (PLANETS_DATA.find(p => p.id === parentId) || { name: parentId.toUpperCase() }) : null;

    this.container.innerHTML = `
      <div class="panel-header">
        <div class="panel-title-group">
          <h2 class="panel-planet-title">${data.name}</h2>
          <span class="panel-planet-subtitle">
            ${isArtificial ? `ARTIFICIAL SPACECRAFT \u2022 ${data.launchYear} \u2022 ${data.countryAgency}` : (isMoon ? `NATURAL SATELLITE OF ${parentPlanet.name.toUpperCase()}` : (data.positionFromSun || data.type || ''))}
          </span>
        </div>
        <button class="panel-close-btn" id="panel-close-btn" title="Close Panel">&times;</button>
      </div>

      <div class="panel-tabs-header">
        <button class="tab-btn ${this.activeTab === 'overview' ? 'active' : ''}" data-tab="overview" title="Overview">Overview</button>
        <button class="tab-btn ${this.activeTab === 'wiki' ? 'active' : ''}" data-tab="wiki" title="Wikipedia Article">Wikipedia</button>
        <button class="tab-btn ${this.activeTab === 'science' ? 'active' : ''}" data-tab="science" title="${isArtificial ? 'Mission Specs & History' : 'Scientific Data'}">${isArtificial ? 'Specs' : 'Science'}</button>
        <button class="tab-btn ${this.activeTab === 'satellites' ? 'active' : ''}" data-tab="satellites" title="${isArtificial || isMoon ? 'Parent Body' : 'Satellites & Moons'}">
          ${isArtificial || isMoon ? 'Parent' : 'Moons'}
        </button>
        <button class="tab-btn ${this.activeTab === 'ai' ? 'active' : ''}" data-tab="ai" title="AI Assistant Explanation">✦ AI</button>
      </div>

      <div class="panel-tab-body">
        ${this.renderTabContent(data, isArtificial, isMoon, parentPlanet)}
      </div>

      <div class="panel-actions-footer">
        ${data.id === 'earth' ? `
          <button class="btn-action btn-earth-fm" id="panel-btn-earth-fm">
            🌍 EXPLORE EARTH FM
          </button>
        ` : ''}
        ${parentId ? `
          <button class="btn-action btn-parent" id="panel-btn-parent">
            &larr; BACK TO ${parentPlanet.name.toUpperCase()}
          </button>
        ` : `
          <button class="btn-action btn-focus" id="panel-btn-focus">🎯 Focus Target</button>
        `}
        <button class="btn-action btn-reset" id="panel-btn-reset">🌌 Reset View</button>
      </div>
    `;

    // Tab Buttons
    this.container.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const tab = btn.getAttribute('data-tab');
        this.activeTab = tab;
        this.render();
      });
    });

    // Close Button
    document.getElementById('panel-close-btn').addEventListener('click', () => {
      this.hide();
      if (this.onCloseCallback) this.onCloseCallback();
    });

    // Earth FM Button
    const earthFMBtn = document.getElementById('panel-btn-earth-fm');
    if (earthFMBtn) {
      earthFMBtn.addEventListener('click', () => {
        this.hide();
        if (this.onExploreEarthFMCallback) this.onExploreEarthFMCallback();
      });
    }

    // Action Buttons
    const focusBtn = document.getElementById('panel-btn-focus');
    if (focusBtn) focusBtn.addEventListener('click', () => { if (this.onFocusCallback) this.onFocusCallback(); });

    const parentBtn = document.getElementById('panel-btn-parent');
    if (parentBtn && parentId) parentBtn.addEventListener('click', () => { if (this.onSelectParentPlanetCallback) this.onSelectParentPlanetCallback(parentId); });

    document.getElementById('panel-btn-reset').addEventListener('click', () => {
      this.hide();
      if (this.onResetCallback) this.onResetCallback();
    });

    // Moon Badges
    this.container.querySelectorAll('.moon-badge').forEach(badge => {
      badge.addEventListener('click', () => {
        const moonId = badge.getAttribute('data-moon-id');
        if (this.onSelectMoonCallback) this.onSelectMoonCallback(moonId);
      });
    });

    // AI Tab Interaction — wire after render
    if (this.activeTab === 'ai') {
      this._wireAITab();
    }
  }

  _wireAITab() {
    const data = this.currentData;
    if (!data) return;

    // Mode selector buttons
    const modeBtns = this.container.querySelectorAll('.ai-mode-btn');
    modeBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const newMode = btn.getAttribute('data-ai-mode');
        this.aiMode = newMode;
        this.aiQuestion = null; // Reset custom question so mode chips generate fresh mode explanations
        this.aiExplanation = null;
        this.aiError = null;
        this._aiRequested = false;
        this.render();
      });
    });

    // Quick question chips
    const qChips = this.container.querySelectorAll('.ai-quick-chip');
    qChips.forEach(chip => {
      chip.addEventListener('click', () => {
        const question = chip.getAttribute('data-question');
        this.aiQuestion = question;
        this.requestAIExplanation(data.id, this.aiMode, question);
      });
    });

    // Custom question textarea
    const questionInput = this.container.querySelector('#ai-question-input');
    if (questionInput) {
      questionInput.value = this.aiQuestion || '';
      questionInput.addEventListener('input', e => {
        this.aiQuestion = e.target.value.trim() || null;
      });
      // Allow select/type inside textarea
      questionInput.addEventListener('mousedown', e => e.stopPropagation());
      questionInput.addEventListener('keydown', e => e.stopPropagation());
    }

    // Main generate button
    const generateBtn = this.container.querySelector('#ai-generate-btn');
    if (generateBtn) {
      generateBtn.addEventListener('click', () => {
        if (this.aiLoading) return;
        this.requestAIExplanation(data.id, this.aiMode, this.aiQuestion);
      });
    }

    // Explain Again button
    const againBtn = this.container.querySelector('#ai-again-btn');
    if (againBtn) {
      againBtn.addEventListener('click', () => {
        if (this.aiLoading) return;
        this.aiExplanation = null;
        this.aiError = null;
        this.requestAIExplanation(data.id, this.aiMode, this.aiQuestion);
      });
    }
  }

  renderTabContent(data, isArtificial, isMoon, parentPlanet) {
    if (this.activeTab === 'overview') {
      return `
        <p class="panel-description">${data.description || 'No overview available.'}</p>

        <div class="panel-section-title">QUICK FACTS</div>
        <div class="panel-stats-grid">
          ${isArtificial ? `
            <div class="stat-card">
              <span class="stat-label">Launch Year</span>
              <span class="stat-value" style="color: #fbbf24">${data.launchYear}</span>
            </div>
            <div class="stat-card">
              <span class="stat-label">Agency / Country</span>
              <span class="stat-value">${data.countryAgency}</span>
            </div>
            <div class="stat-card">
              <span class="stat-label">Mission Category</span>
              <span class="stat-value">${data.missionType}</span>
            </div>
            <div class="stat-card">
              <span class="stat-label">Orbit Type</span>
              <span class="stat-value">${data.orbitType}</span>
            </div>
          ` : `
            <div class="stat-card">
              <span class="stat-label">Diameter</span>
              <span class="stat-value">${data.diameter || 'N/A'}</span>
            </div>
            <div class="stat-card">
              <span class="stat-label">${isMoon ? 'Distance to Planet' : 'Distance to Sun'}</span>
              <span class="stat-value">${data.distanceFromPlanet || data.distanceFromSun || 'N/A'}</span>
            </div>
            <div class="stat-card">
              <span class="stat-label">Orbital Period</span>
              <span class="stat-value">${data.orbitalPeriod || 'N/A'}</span>
            </div>
            <div class="stat-card">
              <span class="stat-label">Rotation Period</span>
              <span class="stat-value">${data.rotationPeriod || 'N/A'}</span>
            </div>
          `}
        </div>

        ${!isArtificial && !isMoon && data.majorSatelliteIds && data.majorSatelliteIds.length > 0 ? `
          <div class="panel-section-title" style="margin-top: 12px;">MAJOR MOONS</div>
          <div class="moon-badges-container">
            ${data.majorSatelliteIds.map(mId => {
              const moon = SATELLITES_DATA.find(s => s.id === mId);
              return moon ? `<button class="moon-badge" data-moon-id="${moon.id}">🌙 ${moon.name}</button>` : '';
            }).join('')}
          </div>
        ` : ''}
      `;
    }

    if (this.activeTab === 'wiki') {
      if (this.wikiLoading) {
        return `
          <div class="panel-placeholder">
            <span class="ph-icon">⏳</span>
            <span class="ph-title">Loading Wikipedia Article...</span>
            <span class="ph-text">Retrieving normalized summary from MediaWiki API.</span>
          </div>
        `;
      }

      if (!this.wikiData) {
        return `
          <div class="panel-placeholder">
            <span class="ph-icon">📚</span>
            <span class="ph-title">Wikipedia Information Unavailable</span>
            <span class="ph-text">Showing COSMOS local scientific data.</span>
          </div>
          <p class="panel-description">${data.description}</p>
        `;
      }

      const wiki = this.wikiData;
      return `
        ${wiki.image ? `
          <div class="wiki-image-container">
            <img src="${wiki.image}" alt="${wiki.title}" class="wiki-image" />
          </div>
        ` : ''}

        <div class="wiki-article-body">
          <span class="wiki-tag">WIKIPEDIA SUMMARY</span>
          <p class="panel-description">${wiki.summary}</p>
        </div>

        <div class="wiki-attribution-bar">
          <span class="wiki-source-label">Source: <b>Wikipedia</b></span>
          <a href="${wiki.pageUrl}" target="_blank" rel="noopener noreferrer" class="btn-wiki-link">
            View on Wikipedia &rarr;
          </a>
        </div>
      `;
    }

    if (this.activeTab === 'science') {
      if (isArtificial) {
        return `
          <div class="panel-section-title">HISTORICAL SIGNIFICANCE & STATUS</div>
          <p class="panel-description" style="margin-bottom: 10px;">${data.significance || 'No historical entry recorded.'}</p>

          <div class="science-table">
            <div class="science-row">
              <span class="sc-label">Operational Status</span>
              <span class="sc-val" style="color: #38bdf8">${data.status || 'N/A'}</span>
            </div>
            <div class="science-row">
              <span class="sc-label">Dimensions</span>
              <span class="sc-val">${data.diameter || 'N/A'}</span>
            </div>
            <div class="science-row">
              <span class="sc-label">Orbital Period</span>
              <span class="sc-val">${data.orbitalPeriod || 'N/A'}</span>
            </div>
          </div>
        `;
      }

      return `
        <div class="panel-section-title">PHYSICAL & ATMOSPHERIC PARAMETERS</div>
        <div class="science-table">
          <div class="science-row">
            <span class="sc-label">Mass</span>
            <span class="sc-val">${data.mass || 'N/A'}</span>
          </div>
          <div class="science-row">
            <span class="sc-label">Surface Temp</span>
            <span class="sc-val">${data.surfaceTemp || 'N/A'}</span>
          </div>
          <div class="science-row">
            <span class="sc-label">${isMoon ? 'Composition' : 'Atmosphere'}</span>
            <span class="sc-val">${data.composition || data.atmosphere || 'N/A'}</span>
          </div>
        </div>
      `;
    }

    if (this.activeTab === 'satellites') {
      if ((isArtificial || isMoon) && parentPlanet) {
        return `
          <div class="parent-planet-card">
            <div class="pp-title-group">
              <span class="pp-label">PARENT BODY</span>
              <h3 class="pp-name">${parentPlanet.name}</h3>
              <span class="pp-type">${parentPlanet.type || ''}</span>
            </div>
            <p class="pp-desc">${parentPlanet.description || ''}</p>
          </div>
        `;
      }

      if (!isArtificial && !isMoon && data.majorSatelliteIds && data.majorSatelliteIds.length > 0) {
        return `
          <div class="panel-section-title">MAJOR SATELLITES (${data.majorSatelliteIds.length})</div>
          <div class="moon-list-detailed">
            ${data.majorSatelliteIds.map(mId => {
              const moon = SATELLITES_DATA.find(s => s.id === mId);
              if (!moon) return '';
              return `
                <div class="moon-card moon-badge" data-moon-id="${moon.id}">
                  <div class="mc-icon">🌙</div>
                  <div class="mc-info">
                    <span class="mc-name">${moon.name}</span>
                    <span class="mc-sub">${moon.diameter} &bull; ${moon.orbitalPeriod}</span>
                  </div>
                  <span class="mc-arrow">&rarr;</span>
                </div>
              `;
            }).join('')}
          </div>
        `;
      }

      return `
        <div class="panel-placeholder">
          <span class="ph-icon">🛰️</span>
          <span class="ph-title">No Major Moons Configured</span>
          <span class="ph-text">This planet does not have major natural satellites in the current dataset.</span>
        </div>
      `;
    }

    // AI TAB
    if (this.activeTab === 'ai') {
      return this._renderAITab(data);
    }

    return '';
  }

  _renderAITab(data) {
    const quickQuestions = this._getQuickQuestions(data);
    const modes = [
      { key: 'beginner', label: '🌱 Beginner' },
      { key: 'student', label: '🎓 Student' },
      { key: 'deepdive', label: '🔬 Deep Dive' }
    ];

    return `
      <div class="ai-panel">
        <!-- Mode Selector -->
        <div class="ai-section-label">EXPLANATION MODE</div>
        <div class="ai-mode-row">
          ${modes.map(m => `
            <button class="ai-mode-btn ${this.aiMode === m.key ? 'active' : ''}" data-ai-mode="${m.key}">
              ${m.label}
            </button>
          `).join('')}
        </div>

        <!-- Quick Questions -->
        <div class="ai-section-label" style="margin-top: 12px;">QUICK QUESTIONS</div>
        <div class="ai-chips-row">
          ${quickQuestions.map(q => `
            <button class="ai-quick-chip" data-question="${q}">${q}</button>
          `).join('')}
        </div>

        <!-- Custom Question -->
        <div class="ai-section-label" style="margin-top: 12px;">ASK YOUR OWN QUESTION</div>
        <textarea
          id="ai-question-input"
          class="ai-question-input"
          placeholder="e.g. Why is this important to science?"
          rows="2"
          maxlength="250"
        ></textarea>

        <!-- Generate Button -->
        <button
          id="ai-generate-btn"
          class="ai-generate-btn ${this.aiLoading ? 'loading' : ''}"
          ${this.aiLoading ? 'disabled' : ''}
        >
          ${this.aiLoading
            ? '<span class="ai-spinner"></span> Generating explanation...'
            : '✦ Generate AI Explanation'
          }
        </button>

        <!-- AI Output -->
        ${this._renderAIOutput(data)}
      </div>
    `;
  }

  _renderAIOutput(data) {
    // Not yet requested — show prompt
    if (!this._aiRequested && !this.aiLoading) {
      return `
        <div class="ai-idle-prompt">
          <span class="ai-idle-icon">✦</span>
          <span class="ai-idle-text">Choose a mode and click <b>Generate AI Explanation</b> to get an AI-powered explanation of ${data.name}.</span>
          <span class="ai-idle-disclaimer">AI explanations are grounded in COSMOS and Wikipedia data. Factual information always comes from scientific sources.</span>
        </div>
      `;
    }

    // Loading
    if (this.aiLoading) {
      return `
        <div class="ai-loading-block">
          <div class="ai-loading-dots"><span></span><span></span><span></span></div>
          <span class="ai-loading-text">Generating explanation for ${data.name}...</span>
          <span class="ai-loading-sub">The scene remains fully interactive while we wait.</span>
        </div>
      `;
    }

    // Error
    if (this.aiError) {
      return `
        <div class="ai-error-block">
          <span class="ai-error-icon">⚠</span>
          <span class="ai-error-msg">${this.aiError}</span>
          <span class="ai-error-sub">You can still explore all factual information in the other tabs above.</span>
          <button id="ai-again-btn" class="ai-again-btn">Try Again</button>
        </div>
      `;
    }

    // Success
    if (this.aiExplanation) {
      const paragraphs = this.aiExplanation
        .split('\n\n')
        .filter(p => p.trim().length > 0)
        .map(p => `<p class="ai-output-para">${p.trim()}</p>`)
        .join('');

      return `
        <div class="ai-output-block">
          <div class="ai-output-header">
            <span class="ai-output-badge">✦ AI EXPLANATION</span>
            <span class="ai-output-mode-tag">${this.aiMode.toUpperCase()}</span>
          </div>
          <div class="ai-output-body">
            ${paragraphs}
          </div>
          <div class="ai-output-footer">
            <span class="ai-disclaimer">AI explanations are grounded in COSMOS &amp; Wikipedia data. Always verify facts with scientific sources.</span>
            <button id="ai-again-btn" class="ai-again-btn">↻ Explain Again</button>
          </div>
        </div>
      `;
    }

    return '';
  }

  _getQuickQuestions(data) {
    const isArtificial = data.category === 'artificial';
    const isMoon = data.type === 'satellite' || data.type === 'Natural Satellite' || data.type === 'Galilean Satellite';

    if (isArtificial) {
      return [
        'Why was this launched?',
        'What makes it important?',
        'How does it work?',
        'What did it discover?'
      ];
    }
    if (isMoon) {
      return [
        'Why do scientists study this moon?',
        'What makes it interesting?',
        'Could life exist here?',
        'How is it different from our Moon?'
      ];
    }
    // Planet / Star
    const questions = ['What makes this interesting?', 'How is it different from Earth?'];
    if (data.id !== 'sun') questions.push('Could life exist here?');
    questions.push('What would it be like to visit?');
    return questions;
  }
}
