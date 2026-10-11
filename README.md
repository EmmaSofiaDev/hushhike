# HushHike 🌲 // The Screenless 30-Second Wilderness Dispatcher

[![Hacktoberfest 2026](https://i.imgur.com/OPaqsZ9.png)](https://dev.to/challenges/hf26)
[![Theme: Touch Grass](https://i.imgur.com/o8XloRa.png)](https://dev.to/challenges/hacktoberfest-week1-2026-10-05)
[![Deploy on Render](https://i.imgur.com/paaSQTo.png)](https://render.com)
[![Voice: ElevenLabs](https://i.imgur.com/YwRDbC4.png)](https://elevenlabs.io)
[![Agent: Mastra](https://i.imgur.com/dCLERz3.png)](https://mastra.ai)
[![GitHub Pages](https://i.imgur.com/74lGqCE.png)](https://emmasofiadev.github.io/hushhike/)
[![License: MIT](https://i.imgur.com/qW0bnx1.png)](LICENSE)

* 🚀 **GitHub Pages Live Demo:** [https://emmasofiadev.github.io/hushhike/](https://emmasofiadev.github.io/hushhike/)
* 🌐 **Render Cloud Service (Blueprint):** [https://hushhike.onrender.com](https://hushhike.onrender.com)

> **Build something with open-source AI at its core that gets people off the screen and into the world.**  
> *HushHike solves the smartphone leash on wilderness trails. In 30 seconds at the trailhead, it synthesizes terrain elevation, solar dusk deadlines, and waypoint landmarks into an acoustic ranger dispatch and a high-contrast 3×5 pocket card—so you can lock your phone in your backpack and navigate by sound and natural landmarks.*

---

## 🏔 The Problem: The Smartphone Leash in the Outdoors

People head into national parks and mountain trails to disconnect, seek solitude, and immerse themselves in nature. Yet the moment they step onto the dirt, they find themselves trapped in a digital loop:
* **Constant Screen Checking:** Squinting at blue GPS dots on AllTrails or Google Maps at every trail fork under bright sunlight.
* **The "Sunset Trap":** Miscalculating mountain shadow falloff, where steep ridges block direct sunlight 30–45 minutes earlier than flat plain sunsets, leaving hikers stranded in rocky boulder fields in pitch darkness.
* **Cold Battery Drain:** Screen-on time and continuous GPS lookups drain lithium phone batteries in cold mountain air, killing emergency communications.

Checking a screen in the woods breaks mindfulness and ruins situational awareness.

---

## ⚡ The Solution: The 30-Second Zero-Screen Pipeline

HushHike enforces one simple rule: **The screen is the shortest part of the hike (under 30 seconds).**

```
┌────────────────────────────────────────────────────────┐
│               AT THE TRAILHEAD (30 SECONDS)             │
│                                                        │
│  [Trail Distance & Elevation] + [Departure Time (14:15)]
│                           │                            │
│                           ▼                            │
│        ┌─────────────────────────────────────┐         │
│        │   HushHike Deterministic Engine    │         │
│        │  - Tobler's Hiking Velocity Model   │         │
│        │  - Mountain Shadow Dusk Ephemeris   │         │
│        │  - Mastra Workflow Hazard Synthesis │         │
│        └──────────────────┬──────────────────┘         │
│                           │                            │
│            ┌──────────────┴──────────────┐             │
│            ▼                             ▼             │
│   [Acoustic Ranger Dispatch]   [3×5 Tactile Field Card]│
│    (ElevenLabs Voice Brief)     (Print / SVG Lockscreen)
└───────────────────────────┬────────────────────────────┘
                            │
                            ▼
      ┌───────────────────────────────────────────┐
      │          ON THE TRAIL (PHONE IN PACK)     │
      │                                           │
      │  * Phone zipped inside backpack pocket    │
      │  * Hiker listens to earbud audio cues     │
      │  * Navigates by physical stone landmarks  │
      │  * Zero notifications. Total immersion.   │
      └───────────────────────────────────────────┘
```

---

## 🚀 Key Features

### 1. Mountain Dusk & Solar Shadow Calculator
Unlike basic weather apps that report flat sea-level sunset, HushHike computes **topographic ridge shadowing**. Steep mountain walls block sunlight 20–45 minutes earlier. HushHike calculates the exact **Mountain Dusk Horizon** and provides a non-negotiable **Hard Turnaround Time** ("Point of No Return").

### 2. Acoustic Ranger Dispatch (ElevenLabs Voice)
In 30 seconds, HushHike generates a concise, 40-word tactical wilderness audio brief. Using **ElevenLabs** natural voice synthesis with Web Audio oscilloscope playback, hikers get a calm, commanding ranger overview before stepping onto the trail.

### 3. Tactile 3×5 Pocket Field Card (Zero Phone Needed)
1-click export of a minimalist, high-contrast SVG card sized exactly for a standard 3×5 index card:
* Turnaround deadline in bold amber typography.
* 4 physical landmark waypoints (e.g., *"Glacier Vista: Twin basalt slabs overlooking moraine → Fork right"*).
* Emergency compass bearings and water pacing.

### 4. Zero Cloud Tracking & Offline Resilience
HushHike executes entirely in client-side memory using Web Audio and deterministic physics. No location coordinates are transmitted to remote tracking brokers. Once loaded, it operates with zero cellular signal.

---

## 🛠 Tech Stack & Partner Tracks

* **Framework:** Next.js 16 (Turbopack, Static Export), React 19, TypeScript 5.
* **Design System:** Pure Vanilla CSS (Deep Forest Evergreen `#070E0A` & Summit Amber `#E5A93C`).
* **Audio Engine:** ElevenLabs API integration + Web Audio API oscilloscope and speech synthesis fallback.
* **Agent Workflow:** Mastra (`@mastra/core`) structured workflow pattern.
* **Cloud Deployment:** **Render** (via automated `render.yaml` Blueprint).

---

## 💻 Running Locally

### 1. Clone the Repository
```bash
git clone https://github.com/EmmaSofiaDev/hushhike.git
cd hushhike
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Start Development Server
```bash
npm run dev
```
Open **`http://localhost:3000`** in your browser.

### 4. Build for Production / Static Export
```bash
npm run build
```
The optimized production bundle will be generated in `./out`.

---

## ☁️ 1-Click Cloud Deployment on Render

HushHike includes an automated `render.yaml` blueprint:
1. Fork or push this repository to GitHub.
2. In the **Render Dashboard**, click **New + Blueprint**.
3. Select the `hushhike` repository.
4. Render will automatically build the Next.js static bundle and provision an HTTPS endpoint.

---

## 📜 License

This project is licensed under the **MIT License**. See [LICENSE](LICENSE) for details.
