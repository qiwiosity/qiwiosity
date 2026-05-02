/**
 * DataContext — Provides all app data from the unified Supabase database.
 *
 * Wraps DataService in a React context so screens can access data
 * synchronously (after initial load). On mount, it syncs with Supabase
 * and caches locally. Falls back to bundled JSON if offline on first launch.
 *
 * Usage:
 *   // In App.js, wrap with <DataProvider>
 *   <DataProvider>
 *     <AppNavigator />
 *   </DataProvider>
 *
 *   // In any screen:
 *   const { attractions, regions, categories, accommodations, loading } = useData();
 */

import React, { createContext, useContext, useEffect, useState } from 'react';
import DataService from '../lib/dataService';

// Bundled defaults — the app works offline from first launch
import bundledAttractions from '../data/attractions.json';
import bundledRegions from '../data/regions.json';
import bundledCategories from '../data/categories.json';
import bundledAccommodations from '../data/accommodations.json';
import bundledPoiImages from '../data/poi_images.json';

const DataContext = createContext(null);

/**
 * Helper: look up images for a POI from the bundled poi_images dict.
 * Returns an array of URL strings.
 */
function getPoiImagesFromBundle(poiId) {
  const imageMap = bundledPoiImages?.attractions || bundledPoiImages || {};
  const urls = imageMap[poiId];
  if (Array.isArray(urls)) return urls;
  return [];
}

export function DataProvider({ children }) {
  const [attractions, setAttractions] = useState(bundledAttractions);
  const [regions, setRegions] = useState(bundledRegions);
  const [categories, setCategories] = useState(bundledCategories);
  const [accommodations, setAccommodations] = useState(bundledAccommodations);
  const [loading, setLoading] = useState(true);
  const [syncStatus, setSyncStatus] = useState('pending');

  useEffect(() => {
    let mounted = true;

    async function init() {
      // 1. Load from local cache first (instant)
      const [cachedAttr, cachedReg, cachedCat, cachedAccom] = await Promise.all([
        DataService.getAttractions(),
        DataService.getRegions(),
        DataService.getCategories(),
        DataService.getAccommodations(),
      ]);

      if (mounted) {
        setAttractions(cachedAttr);
        setRegions(cachedReg);
        setCategories(cachedCat);
        setAccommodations(cachedAccom);
        setLoading(false);
      }

      // 2. Sync with Supabase in the background
      const result = await DataService.sync();
      if (mounted) {
        setSyncStatus(result.status);

        // If new data was synced, refresh state
        if (result.status === 'synced') {
          const [freshAttr, freshReg, freshCat, freshAccom] = await Promise.all([
            DataService.getAttractions(),
            DataService.getRegions(),
            DataService.getCategories(),
            DataService.getAccommodations(),
          ]);
          setAttractions(freshAttr);
          setRegions(freshReg);
          setCategories(freshCat);
          setAccommodations(freshAccom);
        }
      }
    }

    init();

    return () => { mounted = false; };
  }, []);

  const refresh = async () => {
    setLoading(true);
    const result = await DataService.sync({ force: true });
    setSyncStatus(result.status);

    const [freshAttr, freshReg, freshCat, freshAccom] = await Promise.all([
      DataService.getAttractions(),
      DataService.getRegions(),
      DataService.getCategories(),
      DataService.getAccommodations(),
    ]);
    setAttractions(freshAttr);
    setRegions(freshReg);
    setCategories(freshCat);
    setAccommodations(freshAccom);
    setLoading(false);
    return result;
  };

  return (
    <DataContext.Provider value={{
      attractions,
      regions,
      categories,
      accommodations,
      loading,
      syncStatus,
      refresh,
      getPoiImages: getPoiImagesFromBundle,
      getPoiCategory: (poi) => categories.find((c) => c.id === (poi.category === 'wildlife' ? 'nature' : poi.category)),
    }}>
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) {
    throw new Error('useData must be used within a <DataProvider>');
  }
  return ctx;
}

export default DataContext;
