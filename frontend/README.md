# AI MOCKORA - Frontend

This directory contains the user interface for AI MOCKORA, built as a Single Page Application (SPA).

## Architecture & Stack

- **Framework**: React 19
- **Build Tool**: Vite
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Animations**: Framer Motion
- **Icons**: Lucide React
- **Routing**: React Router DOM
- **State & Data Fetching**: Custom React hooks with Fetch API

## Directory Structure

- `src/components/`: Reusable UI components (buttons, inputs, cards, layouts).
- `src/pages/`: Top-level page views (Landing, Dashboard, Interview Room, Signup, etc.).
- `src/context/`: React Context providers (Authentication, Theme).
- `src/lib/`: Utility functions (API client wrapper, local storage handlers, theme helpers).
- `src/App.tsx`: Application entrypoint containing the React Router configuration and route guards.
- `src/index.css`: Global Tailwind CSS imports and base styles.

## Key Features

1. **Authentication**: Handled via JWT stored in Local Storage. Protected routes redirect unauthenticated users to the Login page.
2. **Dynamic UI**: Uses Framer Motion for smooth page transitions and interactive elements.
3. **Responsive Design**: Tailwind CSS ensures the application works seamlessly on both desktop and mobile viewports.
4. **Theme Support**: Includes a dark/light mode toggle that persists user preference in Local Storage.
5. **Real-time Interview UI**: The `InterviewRoomPage` acts as a conversational chat interface with streaming-like interactions, rendering markdown, code blocks, and adaptive questions gracefully.

## Running Locally

To run the frontend locally:

1. Install dependencies:
   ```bash
   npm install
   ```
2. Set up environment variables (copy `.env.example` to `.env.local`). Ensure `VITE_API_BASE_URL` points to your running FastAPI backend (e.g., `http://localhost:8000`).
3. Start the Vite development server:
   ```bash
   npm run dev
   ```

## Building for Production

To create an optimized production build:
```bash
npm run build
```
This generates the static assets in the `dist/` directory, which can be deployed to static hosting providers like Vercel, Netlify, or AWS S3.
