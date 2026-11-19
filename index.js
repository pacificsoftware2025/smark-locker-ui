import { AppRegistry } from 'react-native';
import App from './src/App';
import appConfig from './app.json';

// In Vanilla JS / Express terms:
// This is like your `app.listen(PORT)` in Express.js.
// It registers the root React Native component with the mobile OS runtime.
AppRegistry.registerComponent(appConfig.name, () => App);
