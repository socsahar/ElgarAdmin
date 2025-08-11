/**
 * Elgar Mobile App Entry Point
 * 
 * React Native application for Elgar car theft tracking system
 * Supports Hebrew RTL interface and real-time synchronization
 */

import { AppRegistry } from 'react-native';
import App from './App';
import { name as appName } from './package.json';

// Register the main application component
AppRegistry.registerComponent(appName, () => App);

// For web platform (if using React Native Web)
if (typeof document !== 'undefined') {
  AppRegistry.runApplication(appName, {
    initialProps: {},
    rootTag: document.getElementById('root'),
  });
}
