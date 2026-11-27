import { Platform } from 'react-native';

// ==============================================================================
// TYPOGRAPHY THEME (GEMINI.md Rule 2)
// User specification:
//   --font-family: 'Inter', system-ui, -apple-system, sans-serif;
//
// In Vanilla JS / CSS:
//   font-family: 'Inter', system-ui, -apple-system, sans-serif;
//
// In React Native:
//   fontFamily takes the specific font identifier ('Inter') with system
//   fallbacks depending on the runtime platform (iOS, Android, Web).
// ==============================================================================
export const FONTS = {
  family: Platform.select({
    web: "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif",
    android: 'sans-serif',
    ios: 'system-ui',
    default: 'sans-serif',
  }),
};
