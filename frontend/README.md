# 💻 VoxAgent AI Frontend — React Application

The frontend of VoxAgent AI is a modern React web application built with Vite and Tailwind CSS. It provides an intuitive, high-performance interface for planning workflows, connecting applications, monitoring execution steps in real-time, managing the RAG knowledge base, and handling human-in-the-loop interventions.

---

## 📖 Table of Contents
1. [Tech Stack](#-tech-stack)
2. [Key Screens & Features](#-key-screens--features)
3. [Prerequisites](#-prerequisites)
4. [Setup & Installation](#-setup--installation)
5. [Environment Configuration](#-environment-configuration)
6. [Available Scripts](#-available-scripts)

---

## 💻 Tech Stack
*   **Framework:** React 19 (JavaScript)
*   **Build Tool:** Vite + HMR (Hot Module Replacement)
*   **Styling:** Tailwind CSS + Lucide Icons
*   **State Management:** Zustand (lightweight stores for auth, agents, and logs)
*   **API Queries:** Fetch API + WebSocket connections for real-time telemetry streaming
*   **Routing:** React Router v7
*   **Internationalization:** i18next
*   **Linter:** Oxlint (high-speed rust-based linter)

---

## 🖥️ Key Screens & Features

The user interface consists of the following key views located in `src/pages/`:

*   **`Landing.jsx` (Welcome & Entry):** Introduces VoxAgent AI and serves as the landing dashboard.
*   **`Auth.jsx` (Secure Access):** Manages user registration and logins integrated with Supabase auth.
*   **`AgentStudio.jsx` (Interactive Builder & Telemetry):** The core playground. Let's users describe an objective, watch Gemini formulate a multi-step execution blueprint, run the agent, and stream step-by-step progress, screenshots, and logs in real-time. Also handles human-in-the-loop pauses.
*   **`AppVault.jsx` (Application Manager):** A credential manager to connect accounts (e.g., Slack, GitHub, Google Drive) using Composio and encrypted storage.
*   **`KnowledgeBase.jsx` (RAG Knowledge Hub):** Allows users to upload documents (PDF, CSV, or Web URLs) to store text embeddings for vector retrieval.
*   **`MyAgents.jsx` (Agent Catalog):** Displays the status (active, paused, completed) of all created agents and lets users manage scheduled runs or triggers.
*   **`VaultNotes.jsx` (Extracted Notes):** View and search notes or structural outputs compiled by automated scrapers.

---

## 📋 Prerequisites
*   [Node.js v18 or higher](https://nodejs.org/)
*   npm (included with Node.js) or Yarn / pnpm

---

## ⚙️ Setup & Installation

Follow these steps to set up and run the client locally:

1.  **Navigate to the frontend folder:**
    ```bash
    cd frontend
    ```
2.  **Install dependencies:**
    ```bash
    npm install
    ```
3.  **Configure Environment Variables:**
    *   Create a local env file by duplicating the template:
        ```bash
        cp .env.example .env
        ```
    *   Open `.env` and verify that the API base URL matches your backend instance:
        ```env
        VITE_API_BASE_URL=http://localhost:8000/api/v1
        ```
        *(WebSockets will automatically derive their stream URL from this base API url).*
4.  **Launch the development server:**
    ```bash
    npm run dev
    ```
    *The web application will launch locally at [http://localhost:5173](http://localhost:5173).*

---

## 🛠️ Available Scripts

| Script | Command | Purpose |
| :--- | :--- | :--- |
| `dev` | `npm run dev` | Start Vite dev server with HMR |
| `build` | `npm run build` | Compile and bundle production assets into `/dist` |
| `preview`| `npm run preview` | Spin up a local server to test the production build |
| `lint` | `npm run lint` | Run the Oxlint linter for static code analysis |
