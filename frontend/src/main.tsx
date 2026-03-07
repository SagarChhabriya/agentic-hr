import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Analytics } from '@vercel/analytics/react';
import App from './App';
import './index.css';
import { ThemeProvider } from './contexts/ThemeContext';
import { ClerkProvider } from '@clerk/clerk-react';
import ApiTokenBridge from './components/ApiTokenBridge';

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY || '';

if (!PUBLISHABLE_KEY) {
  console.warn('Missing VITE_CLERK_PUBLISHABLE_KEY - Clerk will run in keyless mode');
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ClerkProvider publishableKey={PUBLISHABLE_KEY || undefined}>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <ApiTokenBridge>
            <App />
          </ApiTokenBridge>
        </ThemeProvider>
      </QueryClientProvider>
    </ClerkProvider>
    <Analytics />
  </React.StrictMode>
);
