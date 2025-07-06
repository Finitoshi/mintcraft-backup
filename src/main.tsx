import { createRoot } from 'react-dom/client'
import { Buffer } from 'buffer'
import App from './App.tsx'
import './index.css'

// Polyfill Buffer for browser compatibility with Solana
(window as any).global = globalThis;
(window as any).Buffer = Buffer;

createRoot(document.getElementById("root")!).render(<App />);
