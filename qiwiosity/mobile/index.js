import { registerRootComponent } from 'expo';
import App from './App';

// registerRootComponent handles environment-specific setup for both Expo Go
// and native builds. Using this (rather than the legacy
// node_modules/expo/AppEntry.js path) is the workspace-friendly entry point.
registerRootComponent(App);
