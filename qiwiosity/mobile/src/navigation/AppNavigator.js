import React from 'react';
import { View, TouchableOpacity } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';

import MapScreen from '../screens/MapScreen';
import AttractionDetailScreen from '../screens/AttractionDetailScreen';
import AccommodationDetailScreen from '../screens/AccommodationDetailScreen';
import ItineraryScreen from '../screens/ItineraryScreen';
import SavedScreen from '../screens/SavedScreen';
import ListDetailScreen from '../screens/ListDetailScreen';
import TourGuideScreen from '../screens/TourGuideScreen';
import SearchScreen from '../screens/SearchScreen';
import SettingsScreen from '../screens/SettingsScreen';
import OfflineScreen from '../screens/OfflineScreen';
import CompareScreen from '../screens/CompareScreen';
import DecisionScreen from '../screens/DecisionScreen';
import NowPlayingStrip from '../components/NowPlayingStrip';
import ScrollableTabBar from '../components/ScrollableTabBar';
import { useCompare } from '../context/CompareContext';
import { useMyLists } from '../context/MyListsContext';
import { useWishlist } from '../context/WishlistContext';
import { colors } from '../theme';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

// Shared header right button for Settings — plain icon only
// Wrapped in a View to override any native iOS header button container styling
function SettingsHeaderButton({ navigation }) {
  return (
    <View style={{ backgroundColor: 'transparent', overflow: 'visible' }}>
      <TouchableOpacity
        onPress={() => navigation.navigate('Settings')}
        style={{
          width: 32,
          height: 32,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'transparent',
        }}
        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
      >
        <Ionicons name="settings-outline" size={22} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

function ExploreStack() {
  return (
    <Stack.Navigator
      screenOptions={({ navigation }) => ({
        headerStyle: { backgroundColor: colors.primary },
        headerTintColor: '#fff',
        headerTitleStyle: { color: '#fff', fontWeight: '600' },
        headerShadowVisible: false,
        headerRight: () => <SettingsHeaderButton navigation={navigation} />,
      })}
    >
      <Stack.Screen name="Map" component={MapScreen} options={{ title: 'Qiwiosity' }} />
      <Stack.Screen name="AttractionDetail" component={AttractionDetailScreen} options={{ title: 'Details' }} />
      <Stack.Screen name="AccommodationDetail" component={AccommodationDetailScreen} options={{ title: 'Stay' }} />
      <Stack.Screen name="Settings" component={SettingsScreen} options={{ title: 'Settings', headerRight: () => null }} />
      <Stack.Screen name="Offline" component={OfflineScreen} options={{ title: 'Offline downloads', headerRight: () => null }} />
    </Stack.Navigator>
  );
}

function SearchStack() {
  return (
    <Stack.Navigator
      screenOptions={({ navigation }) => ({
        headerStyle: { backgroundColor: colors.primary },
        headerTintColor: '#fff',
        headerTitleStyle: { color: '#fff', fontWeight: '600' },
        headerShadowVisible: false,
        headerRight: () => <SettingsHeaderButton navigation={navigation} />,
      })}
    >
      <Stack.Screen name="SearchHome" component={SearchScreen} options={{ title: 'Search & Browse' }} />
      <Stack.Screen name="AttractionDetail" component={AttractionDetailScreen} options={{ title: 'Details' }} />
      <Stack.Screen name="AccommodationDetail" component={AccommodationDetailScreen} options={{ title: 'Stay' }} />
      <Stack.Screen name="Settings" component={SettingsScreen} options={{ title: 'Settings', headerRight: () => null }} />
      <Stack.Screen name="Offline" component={OfflineScreen} options={{ title: 'Offline downloads', headerRight: () => null }} />
    </Stack.Navigator>
  );
}

function CompareStack() {
  return (
    <Stack.Navigator
      screenOptions={({ navigation }) => ({
        headerStyle: { backgroundColor: colors.primary },
        headerTintColor: '#fff',
        headerTitleStyle: { color: '#fff', fontWeight: '600' },
        headerShadowVisible: false,
        headerRight: () => <SettingsHeaderButton navigation={navigation} />,
      })}
    >
      <Stack.Screen name="CompareList" component={CompareScreen} options={{ title: 'Compare' }} />
      <Stack.Screen name="Decision" component={DecisionScreen} options={{ title: 'Decide', headerRight: () => null }} />
      <Stack.Screen name="AttractionDetail" component={AttractionDetailScreen} options={{ title: 'Details' }} />
      <Stack.Screen name="Settings" component={SettingsScreen} options={{ title: 'Settings', headerRight: () => null }} />
      <Stack.Screen name="Offline" component={OfflineScreen} options={{ title: 'Offline downloads', headerRight: () => null }} />
    </Stack.Navigator>
  );
}

function SavedStack() {
  return (
    <Stack.Navigator
      screenOptions={({ navigation }) => ({
        headerStyle: { backgroundColor: colors.primary },
        headerTintColor: '#fff',
        headerTitleStyle: { color: '#fff', fontWeight: '600' },
        headerShadowVisible: false,
        headerRight: () => <SettingsHeaderButton navigation={navigation} />,
      })}
    >
      <Stack.Screen name="SavedHome" component={SavedScreen} options={{ title: 'Saved' }} />
      <Stack.Screen name="ListDetail" component={ListDetailScreen} options={{ title: 'List' }} />
      <Stack.Screen name="AttractionDetail" component={AttractionDetailScreen} options={{ title: 'Details' }} />
      <Stack.Screen name="AccommodationDetail" component={AccommodationDetailScreen} options={{ title: 'Stay' }} />
      <Stack.Screen name="Settings" component={SettingsScreen} options={{ title: 'Settings', headerRight: () => null }} />
      <Stack.Screen name="Offline" component={OfflineScreen} options={{ title: 'Offline downloads', headerRight: () => null }} />
    </Stack.Navigator>
  );
}

function ItineraryStack() {
  return (
    <Stack.Navigator
      screenOptions={({ navigation }) => ({
        headerStyle: { backgroundColor: colors.primary },
        headerTintColor: '#fff',
        headerTitleStyle: { color: '#fff', fontWeight: '600' },
        headerShadowVisible: false,
        headerRight: () => <SettingsHeaderButton navigation={navigation} />,
      })}
    >
      <Stack.Screen name="ItineraryList" component={ItineraryScreen} options={{ title: 'Your Itinerary' }} />
      <Stack.Screen name="AttractionDetail" component={AttractionDetailScreen} options={{ title: 'Details' }} />
      <Stack.Screen name="AccommodationDetail" component={AccommodationDetailScreen} options={{ title: 'Stay' }} />
      <Stack.Screen name="Settings" component={SettingsScreen} options={{ title: 'Settings', headerRight: () => null }} />
      <Stack.Screen name="Offline" component={OfflineScreen} options={{ title: 'Offline downloads', headerRight: () => null }} />
    </Stack.Navigator>
  );
}

/**
 * Custom tab bar wrapper: renders the Now Playing strip directly above
 * the scrollable bottom tab bar.
 */
function TabBarWithNowPlaying(props) {
  return (
    <View>
      <NowPlayingStrip navigation={props.navigation} />
      <ScrollableTabBar {...props} />
    </View>
  );
}

export default function AppNavigator() {
  const compare = useCompare();
  const myLists = useMyLists();
  const wishlist = useWishlist();

  const totalSaved = myLists.lists.reduce((sum, l) => sum + l.items.length, 0) + (wishlist.stats?.total || 0);

  return (
    <Tab.Navigator
      tabBar={(props) => <TabBarWithNowPlaying {...props} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tab.Screen name="Explore" component={ExploreStack} options={{ title: 'Explore' }} />
      <Tab.Screen name="Search" component={SearchStack} options={{ title: 'Search' }} />
      <Tab.Screen
        name="Compare"
        component={CompareStack}
        options={{
          title: 'Compare',
          tabBarBadge: compare.count > 0 ? compare.count : undefined,
          tabBarBadgeStyle: { backgroundColor: colors.accent, fontSize: 10 },
        }}
      />
      <Tab.Screen
        name="Saved"
        component={SavedStack}
        options={{
          title: 'Saved',
          tabBarBadge: totalSaved > 0 ? totalSaved : undefined,
          tabBarBadgeStyle: { backgroundColor: colors.accent, fontSize: 10 },
        }}
      />
      <Tab.Screen name="Itinerary" component={ItineraryStack} options={{ title: 'Itinerary' }} />
      <Tab.Screen name="Guide" component={TourGuideScreen} options={{ title: 'Guide' }} />
    </Tab.Navigator>
  );
}
