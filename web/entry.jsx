import React from 'react';
import { createRoot } from 'react-dom/client';
import App from '../src/App';

// Mount the React Native App component into the browser DOM
const container = document.getElementById('root');
const root = createRoot(container);
root.render(<App />);
