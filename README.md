# VedaAI – AI Assessment Creator (Full-Stack Engineering Assignment)

An elite, full-stack AI-powered **Assessment Creator** designed for educators to configure, generate, refine, and print professional question papers in seconds. Replicated with high-fidelity visual aesthetics (glassmorphism, vibrant gradients, dark/light modes) and robust backends.

---

## 🚀 Key Features

1. **Granular Customization Form (Figma Replicated)**: Enforces validation, handles future due dates, dynamically tallies question counts, compiles instructions, and supports drag-and-drop course material file uploads (PDF/TXT).
2. **Granular Real-Time WebSockets Progress**: Submits the job to a queue and monitors live workers over native WebSockets, displaying stage indicators (e.g. 15% - Analyzing material, 45% - Synthesis, 90% - Wrapping sections) with smooth animations.
3. **Structured AI Prompt Synthesizer**: Interfaces with the official `@google/generative-ai` SDK using `responseMimeType: 'application/json'` to enforce a strict JSON output matching our database models. Never renders raw LLM text blocks.
4. **Resilient Domain-Aware Offline Mock Mode**: If `GEMINI_API_KEY` is not provided in `.env` or generation fails due to rate limits/network, the backend falls back to a mock generator. This parses the assignment's title and parameters to generate highly realistic, subject-oriented questions (Maths, Physics, History, etc.) automatically.
5. **Interactive Question Paper & Inline Editing**: Renders an elegant, structured academic paper, matching student info blocks (Name, Roll No, Section) with underlines. Teachers can click and edit any question text directly in the browser.
6. **Pixel-Perfect A4 PDF Export**: Integrates deep `@media print` CSS rules, letting the teacher click "Download PDF" to evoke the native print dialogue. This compiles a pristine, multi-page black-and-white exam sheet, removing dark mode backgrounds, action bars, and buttons automatically.

---

## 🛠 Tech Stack

- **Frontend**: Next.js 14 (App Router) + TypeScript + Zustand + modular CSS Modules.
- **Backend**: Node.js + Express (TypeScript) + native `ws` WebSockets.
- **Queue Engine**: Redis + BullMQ for resilient asynchronous background tasks.
- **Database**: MongoDB (via Mongoose schemas) persisting assessments and generated question papers.
- **AI Engine**: Google Gemini (via `@google/generative-ai` SDK).

---

## 📐 System Architecture

```
                                  +-----------------------+
                                  |   Teacher (Browser)   |
                                  +-----------+-----------+
                                              |
                          1. POST /api/assignments (Params + File)
                          5. Websocket room subscription
                                              v
                                  +-----------+-----------+
                                  |   Express API & WS    |
                                  +-----+-----------+-----+
                                        |           ^
                    2. Write PENDING    |           | 11. Broadcast WS status
                    status to MongoDB   |           | (PENDING->GENERATING->COMPLETED)
                                        v           |
                                  +-----+-----+     |
                                  |  MongoDB  |     |
                                  +-----------+     |
                                                    |
                                  3. Queue Job      | 10. Read DB /
                                  to BullMQ         |     Trigger WebSocket
                                                    v     
                                  +-----+-----+     |
                                  |  Redis /  |-----+
                                  |  BullMQ   |
                                  +-----+-----+
                                        |
                                        | 6. Pull Job
                                        v
                                  +-----+-----+     7. Call AI     +---------------+
                                  |  BullMQ   |------------------->|  Gemini AI /  |
                                  |  Worker   |<-------------------|  Mock Fallback|
                                  +-----+-----+    8. Return JSON  +---------------+
                                        |
                                        | 9. Save structured
                                        |    paper & status=COMPLETED
                                        v
                                  +-----+-----+
                                  |  MongoDB  |
                                  +-----------+
```

---

## 💻 Directory Layout

```
veda-ai-assessment/
├── docker-compose.yml          # Spins up MongoDB & Redis containers
├── README.md                   # Setup and system instructions
├── backend/                    # Express + TS backend API & Worker
│   ├── package.json
│   ├── tsconfig.json
│   ├── .env                    # Local connection variables & Gemini API Key
│   └── src/
│       ├── config/             # DB and Redis setups
│       ├── controllers/        # REST route handshakes
│       ├── models/             # Mongoose Assignment & QuestionPaper schemas
│       ├── queues/             # BullMQ queue registrations
│       ├── services/           # Gemini API interfaces & Structured JSON prompts
│       ├── sockets/            # WebSockets manager & room broadcasters
│       └── server.ts           # Bootstrapping Express REST & WebSockets
└── frontend/                   # Next.js 14 App Client
    ├── package.json
    ├── tsconfig.json
   ├── next.config.js          # Port 5001 API Proxies
    └── src/
        ├── app/                # Root Layout, Dashboard, Create, and Assessment views
        ├── store/              # Zustand global state hooks
        └── styles/             # Global variables, glassmorphic cards, A4 prints
```

---

## ⚡ Setup & Run Guidelines

Follow these simple steps to run the complete VedaAI suite locally.

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or higher recommended)
- [Docker](https://www.docker.com/) (to easily spin up Redis and MongoDB)

---

### Step 1: Run Infrastructure Containers

To spin up local instances of Redis and MongoDB on standard ports without cluttering your host system, run the Docker Compose configuration:

```bash
docker-compose up -d
```

This launches:
- **MongoDB** running at `mongodb://127.0.0.1:27017/vedaai`
- **Redis** running at `redis://127.0.0.1:6379`

*Note: If you already have Redis or MongoDB running locally on your native macOS system, you can skip this step.*

---

### Step 2: Configure & Start Backend API + Workers

1. Navigate to the backend directory and open the configuration `.env` file:
   ```bash
   cd backend
   ```
2. The template is pre-configured to look for your standard local Redis and MongoDB connections. If you have an active **Gemini API Key**, paste it inside:
   ```env
   PORT=5001
   MONGODB_URI=mongodb://127.0.0.1:27017/vedaai
   REDIS_HOST=127.0.0.1
   REDIS_PORT=6379
   
   # Add your Gemini Key to run actual AI. If blank, offline mock mode engages automatically.
   GEMINI_API_KEY=your_gemini_api_key_here
   ```
3. Launch the API server and BullMQ background workers in development hot-reload mode:
   ```bash
   npm run dev
   ```

You will see confirmation logs in your terminal:
```
====================================================
🚀 Server executing in production-ready mode.
🔌 HTTP API running at http://localhost:5001
🔌 WS Server running at ws://localhost:5001
====================================================
```

---

### Step 3: Start Next.js Frontend Client

1. Open a new terminal tab and navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Start the Next.js development server:
   ```bash
   npm run dev
   ```
3. Open your browser and navigate to:
   [http://localhost:3000](http://localhost:3000)

---

## 🎯 Verification Checklist for Evaluators

1. **Dashboard Empty State**: On the first launch, a beautiful card will instruct you to click "New Assessment".
2. **Form Validations**: Try submitting a negative question count or choosing a past due date. The frontend blocks submissions and renders inline alerts.
3. **Course Materials Upload (Text/PDF)**: Drop a `.txt` or `.pdf` file. The backend utilizes `pdf-parse` in-memory to extract content and pass it directly to the synthesis worker.
4. **WebSocket Generation Track**: Submitting triggers an overlay loader. Watch the stage indicators and progress bars tick up as the BullMQ worker updates.
5. **Interactive Question Editing**: Click "Edit Questions" in the top right. Any text field transforms into an editable textbox, letting you customize details before printing.
6. **A4 Printed Layout**: Click "Download PDF". The browser's native print screen opens, showing a clean, formal academic test. Click Save as PDF to compile a publication-grade document!
