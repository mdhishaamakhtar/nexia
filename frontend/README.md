# ✨ Nexia Frontend

> A premium, glassmorphism-inspired "Digital Sanctuary" for your memories.

This is the official Nexia client interface, built with **Next.js 15**, **Tailwind CSS**, and **Framer Motion**. It delivers a high-fidelity, cinematic experience for managing and interacting with your social circle.

---

## 🎨 Design System

[![Next.js](https://img.shields.io/badge/Framework-Next.js_15-000000?style=for-the-badge&logo=next.js&logoColor=white)](https://nextjs.org/)
[![Tailwind CSS](https://img.shields.io/badge/Styling-Tailwind_3.4-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Framer Motion](https://img.shields.io/badge/Motion-Framer_10-0055FF?style=for-the-badge&logo=framer&logoColor=white)](https://www.framer.com/motion/)
[![TypeScript](https://img.shields.io/badge/Language-TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)

---

## 🔥 Key UI Features

- **AI Intel Chat**: A beautifully designed RAG interface with spacious typography and serif-inspired readability.
- **Glassmorphism Components**: Native-feel blur effects, translucent panels, and vibrant gradient glows.
- **Perfect Grid Layout**: A 3-column row-based explorer that keeps profile cards perfectly aligned.
- **Micro-interactions**: Hover effects, smooth route transitions, and interactive loading states.
- **Responsive Architecture**: Fully optimized for mobile, tablet, and desktop viewports.

---

## 🛠 Prerequisites

- **Node.js**: 18.x or 20.x
- **npm** or **bun**

---

## ⚙️ Setup & Development

### Option A: Full Docker (Recommended)
From the root directory, run:
```bash
export GEMINI_API_KEY=your_key_here
docker-compose up --build
```
This will automatically proxy `/api` calls to the internal backend.

### Option B: Manual Setup
1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Launch Dev Server**
   ```bash
   npm run dev
   ```
   Visit [http://localhost:3000](http://localhost:3000).

   > [!NOTE]
   > When running manually, the frontend expects the backend to be available at `http://localhost:8080`.

---

## 📂 Structure

- `app/`: Next.js 15 App Router pages and simplified hydration logic.
- `components/`: Atomic UI design (Atoms, Molecules, Organisms).
- `lib/api.ts`: Centralized API client using Axios.
- `public/assets/`: Premium assets including the official Nexia banner.

---

## 🔗 Links

- [Root Project README](../README.md)
- [Backend Documentation](../backend/README.md)
