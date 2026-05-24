# DEV_ROADMAP - SoloConnect Systems Tracker

This is an **internal, workspace-only development roadmap** for the SoloConnect creation team. It tracks proposed upgrades, active development cycles, shipped premium components, and security or visual bug registries.

---

## 🚀 STATUS DASHBOARD

| Metric / Track | Count / Milestone | Status |
| :--- | :--- | :--- |
| **Total Features Shipped** | 4 | Ready |
| **Active Sprints** | 2 | In Progress |
| **Ideas & Suggestions Queue** | 3 | Under Review |
| **Active Bug / Glitch Reports** | 1 | Investigating |

---

## 🛠️ ACTIVE DEVELOPMENT STATUS TRACS

### 🟢 SHIPPED & LIVE (FINISHED)
1. **AI-based Founder Matchmaking Engine**
   - **Details**: Built an dynamic matchmaking generator using the Gemini AI endpoint to analyze complementary skills, focuses, and tech backgrounds of different solo founders.
   - **Shipped**: May 2026

2. **Kinetic Momentum Wave Tracker**
   - **Details**: Smooth SVG wave component mounted on founder profiles demonstrating live engagement velocity, network activity, feed creation consistency, and vouching metrics.
   - **Shipped**: May 2026

3. **Multi-Peer Vouching & Collaborative Verification**
   - **Details**: Implemented a secure interface allowing users to vouch for other co-founders, leaving specialized peer validations for skill stacks.
   - **Shipped**: May 2026

4. **Vellum Rich Text TipTap Editor Integration**
   - **Details**: Fluid TipTap instance bundled for feed posts enabling bold text, inline code snippets, rich blocks, and clean typography layouts.
   - **Shipped**: May 2026

---

### 🟡 ACTIVE SPRINTS (IN PROGRESS)
1. **Interactive Portfolio Media Embeds**
   - **Details**: Expand user profiles to support seamless media embeddings, including live iframe previews, dynamic GitHub repository details, and Figma design boards.

2. **Offline Push Notifications & Service Worker Integration**
   - **Details**: Integrate standard browser Service Workers to dispatch background triggers for core chat sessions, notifications of new messages, and partner match proposals.

---

### 🔴 IDEATION QUEUE (PLANNED / PROPOSALS)
1. **Interactive Virtual Audio Lounges & Co-Working Maps**
   - **Details**: Design dynamic floor maps with real-time WebRTC audio rooms to allow founders to share spontaneous pitches, whiteboard concepts, and co-work privately or collaboratively.
   
2. **Vouch Request Messaging Flow**
   - **Details**: Build an automated system inviting team members or external peers to endorse someone on SoloConnect via email or direct ping.

---

## ⚠️ KNOWN ISSUES & BUG TRACKER

### 1. High-Frequency Search Results Render Shift
- **Symptoms**: Transient visual lag or stutter when fetching real-time founder searches during high-write operations on onSnapshot Firestore indices.
- **Severity**: Low (UX Polish needed)
- **Status**: Under Investigation
