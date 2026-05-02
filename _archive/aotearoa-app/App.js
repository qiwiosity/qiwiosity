import 'react-native-gesture-handler';
import React, { useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import AppNavigator from './src/navigation/AppNavigator';
import SplashScreen from './src/screens/SplashScreen';
import { ItineraryProvider } from './src/context/ItineraryContext';

export default function App() {
  const [ready, setReady] = useState(false);

  return (
    <SafeAreaProvider>
      <ItineraryProvider>
        {ready ? (
          <NavigationContainer>
            <AppNavigator />
            <StatusBar style="light" />
          </NavigationContainer>
        ) : (
          <>
            <SplashScreen onBegin={() => setReady(true)} />
            <StatusBar style="light" />
          </>
        )}
      </ItineraryProvider>
    </SafeAreaProvider>
  );
}
