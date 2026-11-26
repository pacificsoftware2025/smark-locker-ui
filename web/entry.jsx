import React from 'react';
import { createRoot } from 'react-dom/client';
import App from '../src/App';

// Clear any leftover hardcoded demo config ('SLL-76138') from browser localStorage
if (typeof window !== 'undefined' && window.localStorage) {
  try {
    const existing = window.localStorage.getItem('SMART_LOCKER_STATION_CONFIG');
    if (existing) {
      const parsed = JSON.parse(existing);
      if (parsed && parsed.stationId === 'SLL-76138' && parsed.stationName === 'Grab n Go Bar Kiosk 01') {
        window.localStorage.removeItem('SMART_LOCKER_STATION_CONFIG');
      }
    }
  } catch (e) {
    // Ignore storage parse errors
  }
}

// Mount the React Native App component into the browser DOM
const container = document.getElementById('root');
const root = createRoot(container);
root.render(<App />);
