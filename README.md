# Vi-Notes

Authenticity verification platform that helps prove content was genuinely written by a human.

Vi-Notes combines keyboard behavior signals with text-level statistical analysis to detect suspicious patterns such as pasted chunks, unusually uniform typing rhythm, and behavior-content mismatch.

Mentor: Jinal Gupta

## Summary

Vi-Notes records writing-session metadata while a user types in a clean editor. It then analyzes:

- Keystroke timing rhythm
- Editing behavior (pauses, corrections)
- Paste activity ranges
- Text structure and consistency signals

After each save, the system generates an authenticity report with score, reasons, and highlighted segments. Sessions can be shared with a public certificate link and replayed to visualize how the text was produced.

## Core Features

### Writing and Monitoring

- Distraction-free editor for live writing
- Keystroke token capture (no raw key logging)
- Delay and rhythm tracking
- Paste event detection with start/end ranges

### Analysis and Detection

- Rule-based scoring pipeline with ML adapter hook
- Segment labeling:
	- normal
	- copied
	- ai_suspect
- Reasons and statistics per session (avg delay, variance, text-to-keystroke ratio, paste count)

### Replay and Evidence

- Session replay with playback speed control
- Typed content appears progressively based on timing
- Pasted content appears in one step (chunk insertion behavior)
- Highlighted replay output:
	- copied segments are visually marked
	- ai_suspect segments are visually marked

### Sharing and Verification

- Share session to generate certificate id
- Copy certificate link directly from dashboard
- Public verification page for proof-of-work review

## Extra Features Added

- Share-session state sync immediately after sharing
- Replay progress bar and speed selector
- Enhanced replay UI controls
- Certificate link copy actions
- Public certificate view redesign with metrics cards
- Session list badges for shared/private state

## Tech Stack

- Frontend: React, TypeScript, React Router, CRA toolchain
- Desktop bridge: Electron entry support in client package
- Backend: Node.js, Express.js, JWT auth
- Database: MongoDB with Mongoose
- Analysis: Rule-based pipeline + TensorFlow adapter placeholder

## Project Structure

```text
Directory structure:
└── chethan13032005-vi-notes/
    ├── README.md
    ├── LICENSE
    ├── client/
    │   ├── README.md
    │   ├── electron.js
    │   ├── package.json
    │   ├── tsconfig.json
    │   ├── .env.example
    │   ├── public/
    │   │   ├── index.html
    │   │   ├── manifest.json
    │   │   └── robots.txt
    │   └── src/
    │       ├── App.css
    │       ├── App.test.tsx
    │       ├── App.tsx
    │       ├── index.css
    │       ├── index.tsx
    │       ├── react-app-env.d.ts
    │       ├── reportWebVitals.ts
    │       ├── setupTests.ts
    │       ├── __mocks__/
    │       │   └── @vercel/
    │       │       └── speed-insights/
    │       │           └── react.tsx
    │       ├── Components/
    │       │   ├── Editor.tsx
    │       │   ├── Login.tsx
    │       │   ├── ReplayPlayer.tsx
    │       │   └── SessionList.tsx
    │       ├── pages/
    │       │   └── CertificateView.tsx
    │       └── types/
    │           └── contracts.ts
    └── server/
        ├── config.js
        ├── index.js
        ├── package.json
        ├── .env.example
        ├── controllers/
        │   └── session.controller.ts
        ├── middleware/
        │   └── requireAuth.js
        ├── ml/
        │   ├── analyzer.js
        │   ├── featureExtractor.js
        │   ├── segmentDetector.js
        │   └── adapters/
        │       └── tensorflowAdapter.js
        ├── models/
        │   ├── Session.js
        │   ├── Session.ts
        │   └── User.js
        ├── routes/
        │   ├── auth.js
        │   ├── session.js
        │   ├── session.routes.ts
        │   └── verify.js
        └── utils/
            ├── analyze.js
            └── validateRawSessionData.js

```

## Installation

### Prerequisites

- Node.js 18+
- npm 9+
- MongoDB running locally or a reachable MongoDB URI

### 1) Clone and install dependencies

```bash
git clone <your-repo-url>
cd vi-notes

cd client
npm install

cd ../server
npm install
```

## Environment Setup

Create file at server/.env and fill values:

```env
PORT=5000
MONGO_URI=mongodb://127.0.0.1:27017/vinotes
JWT_SECRET=change_this_to_a_long_random_secret
```

Notes:

- Use a long random value for JWT_SECRET in real environments.
- If MongoDB is remote, replace MONGO_URI accordingly.

## Run the Project

Open two terminals.

### Terminal 1: Backend

```bash
cd server
npm run dev
```

Server starts at http://localhost:5000

### Terminal 2: Frontend

```bash
cd client
npm start
```

App starts at http://localhost:3000

### Optional: Electron client entry

```bash
cd client
npm run electron
```

## Scripts

### Client scripts

- npm start: run React dev server
- npm run build: production build
- npm test: run client tests
- npm run electron: launch electron entry
- npm run eject: CRA eject

### Server scripts

- npm start: run server with node
- npm run dev: run server with nodemon
- npm test: placeholder test command

## Routes (Backend API)

Base server URL: http://localhost:5000

### Health

- GET /health

### Auth routes

- POST /auth/register
	- body: name, email, password, confirmPassword
	- returns: _id, email, token
- POST /auth/login
	- body: email, password
	- returns: _id, email, token

### Session routes (protected by Bearer token)

- POST /api/sessions/save
	- body: userId, text, keystrokes, pasteEvents
	- returns: sessionId, analysis, score
- GET /api/sessions/user/:userId
	- returns: all sessions for authenticated user
- PUT /api/sessions/:id/share
	- returns: certificateId, isPublic, score

### Public verify route

- GET /api/verify/:certificateId
	- returns: content, metadata (keystrokes and pasteEvents), score, segments

## Frontend Navigation

### App routes

- /login: login page
- /register: register page (same auth component flow)
- /dashboard: main editor and reports (requires login)
- /verify/:certificateId: public certificate page

### User flow

1. Register or login
2. Write naturally in dashboard editor
3. Save session
4. Review authenticity report and detection map
5. Open replay preview to inspect composition behavior
6. Share session to generate certificate
7. Open public certificate page and copy/share proof link

## Usage Guide

### Writing Session

- Type content in editor
- Keystrokes and paste events are captured as metadata
- Save session to run analysis pipeline

### Authenticity Report

Each saved session includes:

- Score (0-100)
- Reasons (human-like signals or suspicious indicators)
- Stats (typing rhythm and text-generation ratio)
- Segments (normal, copied, ai_suspect)

### Replay Behavior

- Play reproduces writing timeline
- Normal typed content appears progressively
- Pasted blocks appear at once at their paste event moment
- Highlighting helps separate copied and normal regions

### Share and Verify

- Click Share Session in selected session panel
- Certificate id and public URL are generated
- Open Certificate View to inspect replay and metrics publicly

## What Output You Should See

On dashboard after saving:

- Authenticity score
- Reasons list
- Detection map with highlighted ranges
- Replay preview with controls

On certificate page:

- Public proof page with score and metrics
- Replay playback of that shared session
- Copy-link action for certificate URL

## Detection Logic Overview

Vi-Notes uses a layered pipeline:

1. Feature extraction from typing and text behavior
2. ML adapter prediction attempt (currently placeholder)
3. Rule-based scoring fallback
4. Segment detection using paste ranges + behavior heuristics

This approach allows immediate functionality today and future ML model upgrades without changing API contracts.

## Privacy Notes

- No raw key content logging; tokenized keystroke events are used
- Metadata focus: timing, delays, edit patterns, paste ranges
- Public verification requires explicit session sharing

## Upcoming Features

- Stronger ML models for behavior-text correlation
- Better anomaly calibration per user writing profile
- Expanded report explainability and evidence visuals
- Improved desktop-level capture workflows

## Sequence diagram of vi-notes
![Sequence_diagram](https://github.com/user-attachments/assets/ae2d34df-acb3-433d-80cd-e0d7c84fb5f0)


## Architectural view of vi-notes
<img width="4088" height="9844" alt="diagram" src="https://github.com/user-attachments/assets/85f64f28-1b83-4fcf-b54d-96b4eb3ec105" />



## License

MIT License
