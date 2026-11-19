import React from 'react';
import { StatusBar } from 'react-native';
import { KioskView } from './screens/KioskView';

// ==============================================================================
// REACT NATIVE ENTRY COMPONENT: App
// The root component for the Smart Locker Kiosk tablet application.
// ==============================================================================
export default function App() {
  return (
    <>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      <KioskView />
    </>
  );
}
