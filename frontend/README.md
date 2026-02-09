# Frontend Application

React-based frontend application for the HR Automation SaaS Platform.

## Tech Stack

- **Framework**: React 18+ with TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **State Management**: React Query (TanStack Query) + Zustand
- **Routing**: React Router v6
- **HTTP Client**: Axios
- **Form Handling**: React Hook Form + Zod

## Project Structure

```
frontend/
├── src/
│   ├── components/     # Reusable UI components
│   ├── contexts/        # React contexts (Auth, etc.)
│   ├── pages/          # Page components
│   ├── services/       # API services
│   ├── types/          # TypeScript types
│   ├── App.tsx         # Root component
│   └── main.tsx        # Entry point
└── public/             # Static assets
```

## Setup

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Set up environment variables**:
   ```bash
   cp env.example .env
   # Edit .env with your configuration
   ```

3. **Start development server**:
   ```bash
   npm run dev
   ```

The application will be available at `http://localhost:5173`

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint
- `npm run format` - Format code with Prettier
- `npm run test` - Run tests
- `npm run test:ui` - Run tests with UI

## Features

- ✅ User authentication (login/register)
- ✅ Protected routes
- ✅ Responsive design with Tailwind CSS
- ✅ API integration with Axios
- 🚧 Job management (coming soon)
- 🚧 Assessment interface (coming soon)
- 🚧 AI interview interface (coming soon)

## Environment Variables

See `env.example` for required environment variables:- `VITE_API_URL` - Backend API URL
- `VITE_WS_URL` - WebSocket URL
- `VITE_LIVEKIT_URL` - LiveKit WebSocket URL
- `VITE_LIVEKIT_API_KEY` - LiveKit API key
- `VITE_LIVEKIT_API_SECRET` - LiveKit API secret## DevelopmentThe app uses Vite's HMR (Hot Module Replacement) for fast development. Changes to components will automatically reload in the browser.## Building for Production```bash
npm run build
```The production build will be in the `dist/` directory, ready to be deployed to any static hosting service (Vercel, Netlify, etc.).## Documentation- [React Documentation](https://react.dev/)
- [Vite Documentation](https://vitejs.dev/)
- [Tailwind CSS Documentation](https://tailwindcss.com/)
- [React Router Documentation](https://reactrouter.com/)