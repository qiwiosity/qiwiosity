import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';

import MapScreen from '../screens/MapScreen';
import AttractionsScreen from '../screens/AttractionsScreen';
import AttractionDetailScreen from '../screens/AttractionDetailScreen';
import ItineraryScreen from '../screens/ItineraryScreen';
import AccommodationsScreen from '../screens/AccommodationsScreen';
import TourGuideScreen from '../screens/TourGuideScreen';
import { colors } from '../theme';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function ExploreStack() {
  return (
    <Stack.Navigator screenOptions={{ headerStyle: { backgroundColor: colors.primary }, headerTintColor: '#fff' }}>
      <Stack.Screen name="Map" component={MapScreen} options={{ title: 'Qiwiosity' }} />
      <Stack.Screen name="AttractionDetail" component={AttractionDetailScreen} options={{ title: 'Details' }} />
    </Stack.Navigator>
  );
}

function AttractionsStack() {
  return (
    <Stack.Navigator screenOptions={{ headerStyle: { backgroundColor: colors.primary }, headerTintColor: '#fff' }}>
      <Stack.Screen name="AttractionsList" component={AttractionsScreen} options={{ title: 'Attractions' }} />
      <Stack.Screen name="AttractionDetail" component={AttractionDetailScreen} options={{ title: 'Details' }} />
    </Stack.Navigator>
  );
}

function ItineraryStack() {
  return (
    <Stack.Navigator screenOptions={{ headerStyle: { backgroundColor: colors.primary }, headerTintColor: '#fff' }}>
      <Stack.Screen name="ItineraryList" component={ItineraryScreen} options={{ title: 'Your Itinerary' }} />
      <Stack.Screen name="AttractionDetail" component={AttractionDetailScreen} options={{ title: 'Details' }} />
    </Stack.Navigator>
  );
}

export default function AppNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.muted,
        tabBarIcon: ({ color, size }) => {
          const map = {
            Explore: 'map',
            Attractions: 'compass',
            Itinerary: 'list',
            Stay: 'bed',
            Guide: 'headset',
          };
          return <Ionicons name={map[route.name]} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Explore" component={ExploreStack} />
      <Tab.Screen name="Attractions" component={AttractionsStack} />
      <Tab.Screen name="Itinerary" component={ItineraryStack} />
      <Tab.Screen name="Stay" component={AccommodationsScreen} />
      <Tab.Screen name="Guide" component={TourGuideScreen} />
    </Tab.Navigator>
  );
}
