import React, { createContext, useContext, useEffect, useReducer, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@qiwiosity/my-lists';

const MyListsContext = createContext(null);

// ── Default lists that ship with the app ──────────────────────────────
const DEFAULT_LISTS = [
  {
    id: 'bucket-list',
    name: 'Bucket List',
    icon: 'heart',
    color: '#E07B3C',
    items: [],
    createdAt: new Date().toISOString(),
  },
];

const initial = { lists: [], loaded: false };

function reducer(state, action) {
  switch (action.type) {
    case 'hydrate':
      return { lists: action.lists || DEFAULT_LISTS, loaded: true };

    // ── List CRUD ─────────────────────────────────────────────────────
    case 'create_list': {
      const newList = {
        id: `list-${Date.now()}`,
        name: action.name,
        icon: action.icon || 'bookmark',
        color: action.color || '#15888A',
        items: [],
        createdAt: new Date().toISOString(),
      };
      return { ...state, lists: [...state.lists, newList] };
    }

    case 'rename_list':
      return {
        ...state,
        lists: state.lists.map((l) =>
          l.id === action.listId ? { ...l, name: action.name } : l,
        ),
      };

    case 'update_list_style':
      return {
        ...state,
        lists: state.lists.map((l) =>
          l.id === action.listId
            ? { ...l, icon: action.icon ?? l.icon, color: action.color ?? l.color }
            : l,
        ),
      };

    case 'delete_list':
      return {
        ...state,
        lists: state.lists.filter((l) => l.id !== action.listId),
      };

    // ── Item operations ───────────────────────────────────────────────
    case 'add_to_list': {
      return {
        ...state,
        lists: state.lists.map((l) => {
          if (l.id !== action.listId) return l;
          // Don't add duplicates
          if (l.items.some((i) => i.id === action.item.id)) return l;
          return { ...l, items: [...l.items, { ...action.item, addedAt: new Date().toISOString() }] };
        }),
      };
    }

    case 'remove_from_list':
      return {
        ...state,
        lists: state.lists.map((l) => {
          if (l.id !== action.listId) return l;
          return { ...l, items: l.items.filter((i) => i.id !== action.itemId) };
        }),
      };

    case 'move_to_list': {
      // Remove from source, add to target
      let movedItem = null;
      const afterRemove = state.lists.map((l) => {
        if (l.id !== action.fromListId) return l;
        movedItem = l.items.find((i) => i.id === action.itemId);
        return { ...l, items: l.items.filter((i) => i.id !== action.itemId) };
      });
      if (!movedItem) return state;
      return {
        ...state,
        lists: afterRemove.map((l) => {
          if (l.id !== action.toListId) return l;
          if (l.items.some((i) => i.id === movedItem.id)) return l;
          return { ...l, items: [...l.items, movedItem] };
        }),
      };
    }

    default:
      return state;
  }
}

export function MyListsProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initial);

  // Hydrate from storage
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        const parsed = raw ? JSON.parse(raw) : null;
        dispatch({ type: 'hydrate', lists: parsed && parsed.length > 0 ? parsed : DEFAULT_LISTS });
      })
      .catch(() => dispatch({ type: 'hydrate', lists: DEFAULT_LISTS }));
  }, []);

  // Persist on change
  useEffect(() => {
    if (!state.loaded) return;
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state.lists)).catch(() => {});
  }, [state.lists, state.loaded]);

  const api = {
    lists: state.lists,
    loaded: state.loaded,

    // List CRUD
    createList: useCallback((name, icon, color) =>
      dispatch({ type: 'create_list', name, icon, color }), []),
    renameList: useCallback((listId, name) =>
      dispatch({ type: 'rename_list', listId, name }), []),
    updateListStyle: useCallback((listId, icon, color) =>
      dispatch({ type: 'update_list_style', listId, icon, color }), []),
    deleteList: useCallback((listId) =>
      dispatch({ type: 'delete_list', listId }), []),

    // Item operations
    addToList: useCallback((listId, item) =>
      dispatch({ type: 'add_to_list', listId, item }), []),
    removeFromList: useCallback((listId, itemId) =>
      dispatch({ type: 'remove_from_list', listId, itemId }), []),
    moveToList: useCallback((fromListId, toListId, itemId) =>
      dispatch({ type: 'move_to_list', fromListId, toListId, itemId }), []),

    // Queries
    /** Check if a POI is in any list */
    isInAnyList: useCallback((poiId) =>
      state.lists.some((l) => l.items.some((i) => i.id === poiId)), [state.lists]),
    /** Get all lists that contain a specific POI */
    listsContaining: useCallback((poiId) =>
      state.lists.filter((l) => l.items.some((i) => i.id === poiId)), [state.lists]),
    /** Check if a POI is in a specific list */
    isInList: useCallback((listId, poiId) => {
      const list = state.lists.find((l) => l.id === listId);
      return list ? list.items.some((i) => i.id === poiId) : false;
    }, [state.lists]),
  };

  return <MyListsContext.Provider value={api}>{children}</MyListsContext.Provider>;
}

export function useMyLists() {
  const ctx = useContext(MyListsContext);
  if (!ctx) throw new Error('useMyLists must be used inside MyListsProvider');
  return ctx;
}
