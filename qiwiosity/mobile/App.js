import 'react-native-gesture-handler';
import React, { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import AppNavigator from './src/navigation/AppNavigator';
import SplashScreen from './src/screens/SplashScreen';
import LoadingScreen from './src/screens/LoadingScreen';
import { AuthProvider } from './src/context/AuthContext';
import { ItineraryProvider } from './src/context/ItineraryContext';
import { CompareProvider } from './src/context/CompareContext';
import { MyListsProvider } from './src/context/MyListsContext';
import { PreferencesProvider } from './src/context/PreferencesContext';
import { NarrationProvider, useSharedNarration } from './src/context/NarrationContext';
import { usePreferences } from './src/context/PreferencesContext';
import { DataProvider, useData } from './src/context/DataContext';
import { WishlistProvider } from './src/context/WishlistContext';
import useGeofence from './src/hooks/useGeofence';

/**
 * Bridge: ties the foreground geofence watcher to the shared narration
 * player, gated by the user's "autoplay on arrival" preference. Lives
 * inside the provider tree so it can read both.
 */
function GeofenceBridge() {
  const narration = useSharedNarration();
  const prefs = usePreferences();
  const { attractions } = useData();

  useGeofence(({ attraction }) => {
    if (!prefs.loaded) return;
    if (!prefs.storyAutoPlay) return;
    narration.toggle(attraction, prefs.audioLength || 'standard');
  }, attractions);

  return null;
}

/**
 * Inner shell — sits inside the provider tree so it can read DataContext
 * to know when data is ready and drive the splash → loading → app flow.
 */
function AppShell() {
  // 'splash' → 'loading' → 'ready'
  const [phase, setPhase] = useState('splash');
  const { loading: dataLoading } = useData();

  return (
    <>
      {phase === 'splash' && (
        <>
          <SplashScreen onBegin={() => setPhase('loading')} />
          <StatusBar style="light" />
        </>
      )}

      {phase === 'loading' && (
        <>
          <LoadingScreen
            dataReady={!dataLoading}
            onFinished={() => setPhase('ready')}
          />
          <StatusBar style="light" />
        </>
      )}

      {phase === 'ready' && (
        <>
          <NavigationContainer>
            <AppNavigator />
            <StatusBar style="light" />
          </NavigationContainer>
          <GeofenceBridge />
        </>
      )}
    </>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <DataProvider>
          <PreferencesProvider>
            <ItineraryProvider>
              <CompareProvider>
                <MyListsProvider>
                  <WishlistProvider>
                    <NarrationProvider>
                      <AppShell />
                    </NarrationProvider>
                  </WishlistProvider>
                </MyListsProvider>
              </CompareProvider>
            </ItineraryProvider>
          </PreferencesProvider>
        </DataProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
