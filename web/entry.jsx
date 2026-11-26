import React from 'react';
import { createRoot } from 'react-dom/client';
import App from '../src/App';

// Pre-seed an active demo station in browser localStorage if unconfigured
// so that the web preview / Netlify site is immediately testable without setup blocks
if (typeof window !== 'undefined' && window.localStorage) {
  const existing = window.localStorage.getItem('SMART_LOCKER_STATION_CONFIG');
  if (!existing || existing.includes('SETUP REQUIRED')) {
    window.localStorage.setItem('SMART_LOCKER_STATION_CONFIG', JSON.stringify({
      stationId: 'SLL-76138',
      hardwareId: 'SLL-76138',
      stationName: 'Grab n Go Bar Kiosk 01',
      totalDoors: 16,
      bindingStatus: 'BOUND_ACTIVE',
      locationTag: 'Level 1, Main Entrance',
      operatorName: 'Demo Operator',
    }));
  }
}

// Mount the React Native App component into the browser DOM
const container = document.getElementById('root');
const root = createRoot(container);
root.render(<App />);
