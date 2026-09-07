# 🌌 COSMOS — Interactive 3D Solar System & Spacecraft Exploration Platform

[![License: MIT](https://img.shields.io/badge/License-MIT-sky.svg)](LICENSE)
[![Three.js](https://img.shields.io/badge/Three.js-r160-black.svg)](https://threejs.org/)
[![Node.js](https://img.shields.io/badge/Node.js-v18+-green.svg)](https://nodejs.org/)
[![Express.js](https://img.shields.io/badge/Express.js-v4.18-blue.svg)](https://expressjs.com/)

**COSMOS** is an interactive, photorealistic 3D astronomical simulation platform that combines physical solar system orbits, real-time UTC clock solar synchronization, live satellite tracking, interactive global web radio, Wikipedia knowledge integration, and AI-powered astronomical explanation capabilities.

---

## ✨ Features

- ☀️ **Real-Time UTC Solar Sync Engine**:
  - Live UTC Clock HUD badge synchronized with physical solar orientation.
  - Real-time country solar status calculator computing **🌅 SUNRISE**, **☀️ DAYTIME**, **🌇 SUNSET**, and **🌙 NIGHTTIME** cycles dynamically across the 3D globe.
  - Accurate day/night illumination across Earth's surface matching real-world local solar hours.

- 🪐 **Interactive 3D Solar System**:
  - Photorealistic PBR materials, multi-pass GLSL atmospheric Fresnel shaders, and ring shadow projections.
  - Complete astronomical system including the Sun, 8 major planets, 17 natural satellite moons, and 50+ artificial spacecraft & space telescopes.
  - Smooth camera animation engine with automatic target focusing and WASD elevation controls.

- 📻 **Earth FM — Interactive 3D Global Radio Explorer**:
  - Click anywhere on the 3D Earth globe or select a country label to discover nearby live radio streams powered by Radio-Browser API.
  - HTML5 audio engine with volume controls, genre filtering, search, and live equalizer visualizer.

- ⚙️ **Left Slide-Out Controls Burger Drawer**:
  - Clean burger menu button (`☰ CONTROLS`) in the top navigation header.
  - Sleek glassmorphic drawer containing controls for Motion Simulation, Time Acceleration ($0\times$ to $1000\times$), Orbit Paths, Celestial Labels, and Layer Toggles.

- 📚 **Wikipedia & AI Astronomical Guide**:
  - Live Wikipedia integration fetching full astronomical summaries, physical parameters, orbital mechanics, and history.
  - AI Explanation engine powered by Google Gemini API providing clear answers for complex space questions.

- 📡 **Spacecraft & Satellite Fleet**:
  - Historic & active space missions including **ISRO** (Chandrayaan-3, Aditya-L1, Mangalyaan, NISAR, Aryabhata), **NASA/ESA** (JWST, Hubble, Voyager 1/2, Parker Solar Probe, ISS), Starlink constellations, and GPS satellites.

---

## 🛠️ Tech Stack

- **Frontend**: HTML5, Vanilla JavaScript (ES Modules), Three.js (r160), CSS3 (Custom Glassmorphism Design System)
- **Backend API**: Node.js, Express.js, CORS, Dotenv
- **Graphics & Shaders**: Custom GLSL Shaders (Fresnel Edge Glow, Procedural Solar Flares)
- **Data Integrations**: Wikipedia REST API, Radio-Browser API, NASA Open APIs

---

## 🚀 Quick Start

### 1. Prerequisites
Ensure you have **Node.js** (v18 or higher) installed on your machine.

### 2. Installation
Clone the repository and install dependencies:
```bash
git clone https://github.com/sivatejajetti/Cosmos.git
cd Cosmos
npm install
```

### 3. Running Locally
Start the integrated server (runs both the API engine on port `5000` and frontend client on port `8080`):
```bash
npm start
```
Then open **`http://localhost:8080`** in your browser!

---

## 📡 Backend API Endpoints

| Endpoint | Method | Description |
| :--- | :---: | :--- |
| `/api/v1/health` | `GET` | API Health & Uptime Status |
| `/api/v1/objects` | `GET` | Full list of 3D celestial bodies & spacecraft |
| `/api/v1/wikipedia/:title` | `GET` | Wikipedia summary & metadata for specified object |
| `/api/v1/ai/explain` | `POST` | AI-generated astronomical explanation |
| `/api/v1/radio/nearby` | `GET` | Nearby live radio stations by latitude/longitude |
| `/api/v1/satellites/tle` | `GET` | Real-time Two-Line Element (TLE) satellite orbit data |

---

## 🎮 Controls & Shortcuts

| Action | Control |
| :--- | :--- |
| **Orbit Camera** | Left Click + Drag |
| **Pan Camera** | Right Click + Drag |
| **Zoom In / Out** | Mouse Scroll Wheel |
| **Camera Translation** | <kbd>W</kbd> <kbd>A</kbd> <kbd>S</kbd> <kbd>D</kbd> |
| **Camera Elevation** | <kbd>Space</kbd> / <kbd>Shift</kbd> |
| **Reset View** | <kbd>R</kbd> / <kbd>ESC</kbd> or **🌌 Reset View** button |
| **Toggle Controls Panel** | Click **☰ CONTROLS** in header |
| **Select Celestial Body** | Click any Planet, Moon, or Satellite |

---

## 📜 License

This project is open source and available under the [MIT License](LICENSE).
