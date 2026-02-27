# ✨ Nexia Frontend

> A premium, glassmorphism-inspired "Digital Sanctuary" for your memories.

This is the official Nexia client interface, built with **Next.js 16**, **Tailwind CSS 4**, and **Framer Motion**. It delivers a high-fidelity, cinematic experience for managing and interacting with your social circle.

---

## 🛠 Tech Stack

[![Next.js](https://img.shields.io/badge/Next.js-16-000000?style=for-the-badge&logo=next.js&logoColor=white)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-149ECA?style=for-the-badge&logo=react&logoColor=white)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![Framer Motion](https://img.shields.io/badge/Framer_Motion-12-0055FF?style=for-the-badge&logo=framer&logoColor=white)](https://www.framer.com/motion/)
[![TanStack Query](https://img.shields.io/badge/TanStack_Query-5-FF4154?style=for-the-badge&logo=reactquery&logoColor=white)](https://tanstack.com/query)
[![Axios](https://img.shields.io/badge/Axios-1.13-5A29E4?style=for-the-badge&logo=axios&logoColor=white)](https://axios-http.com/)

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

- `app/`: Next.js 16 App Router pages and simplified hydration logic.
- `components/`: Atomic UI design (Atoms, Molecules, Organisms).
- `lib/api.ts`: Centralized API client using Axios.
- `public/assets/`: Premium assets including the official Nexia banner.

---

## 🔗 Links

- [Root Project README](../README.md)
- [Backend Documentation](../backend/README.md)
