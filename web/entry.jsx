import React from 'react';
import { createRoot } from 'react-dom/client';
import App from '../src/App';
import { ENV } from '../src/config/env';

// Reversible Netlify Static Demo Seeder (controlled by ENV.enableWebStaticDemo in src/config/env.js):
// - When true: pre-seeds localStorage with active demo station so Netlify URL works without setup.
// - When reverted to false: automatically cleans out the temporary demo station from localStorage.
if (typeof window !== 'undefined' && window.localStorage) {
  try {
    const raw = window.localStorage.getItem('SMART_LOCKER_STATION_CONFIG');
    const parsed = raw ? JSON.parse(raw) : null;

    if (ENV.enableWebStaticDemo) {
      if (
        !parsed ||
        !parsed.stationId ||
        parsed.stationId === 'SETUP REQUIRED' ||
        parsed.bindingStatus !== 'BOUND_ACTIVE'
      ) {
        window.localStorage.setItem(
          'SMART_LOCKER_STATION_CONFIG',
          JSON.stringify({
            stationId: ENV.webStaticStationId,
            hardwareId: ENV.webStaticStationId,
            stationName: ENV.webStaticStationName,
            totalDoors: 16,
            bindingStatus: 'BOUND_ACTIVE',
            locationTag: 'Level 1, Main Entrance',
            operatorName: 'Demo Operator',
          })
        );
      }
    } else if (parsed && parsed.stationId === ENV.webStaticStationId) {
      window.localStorage.removeItem('SMART_LOCKER_STATION_CONFIG');
    }
  } catch (e) {
    // Ignore storage parse errors
  }
}

// Mount the React Native App component into the browser DOM
const container = document.getElementById('root');
const root = createRoot(container);
root.render(<App />);
