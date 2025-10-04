"use client";

import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import {
  searchService,
  SearchResult,
  SearchSuggestion,
  SearchHistory,
  PopularSearch,
  ImageData,
  VideoData,
  StoryData,
  User
} from '@/lib/mock-backend';

// Search state interface
interface SearchState {
  // Current search
  query: string;
  results: SearchResult[];
  suggestions: SearchSuggestion[];
  isSearching: boolean;
  error: string | null;

  // Filters and pagination
  filters: {
    type: 'all' | 'image' | 'video' | 'story' | 'user';
    category?: string;
    sortBy: 'relevance' | 'date' | 'popularity';
  };
  currentPage: number;
  totalResults: number;
  hasMore: boolean;

  // History and popular searches
  searchHistory: SearchHistory[];
  popularSearches: PopularSearch[];
  showSuggestions: boolean;

  // Recent searches (from local storage)
  recentSearches: string[];

  // Cache
  resultCache: Map<string, { results: SearchResult[]; timestamp: number }>;
}

// Action types
type SearchAction =
  | { type: 'SET_QUERY'; payload: string }
  | { type: 'SET_SEARCHING'; payload: boolean }
  | { type: 'SET_RESULTS'; payload: { results: SearchResult[]; total: number; suggestions: SearchSuggestion[] } }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_SUGGESTIONS'; payload: SearchSuggestion[] }
  | { type: 'SET_FILTERS'; payload: Partial<SearchState['filters']> }
  | { type: 'SET_PAGE'; payload: number }
  | { type: 'SET_HISTORY'; payload: SearchHistory[] }
  | { type: 'SET_POPULAR_SEARCHES'; payload: PopularSearch[] }
  | { type: 'TOGGLE_SUGGESTIONS'; payload: boolean }
  | { type: 'ADD_RECENT_SEARCH'; payload: string }
  | { type: 'CLEAR_RECENT_SEARCHES' }
  | { type: 'LOAD_FROM_STORAGE' }
  | { type: 'RESET_SEARCH' };

// Initial state
const initialState: SearchState = {
  query: '',
  results: [],
  suggestions: [],
  isSearching: false,
  error: null,
  filters: {
    type: 'all',
    sortBy: 'relevance',
  },
  currentPage: 1,
  totalResults: 0,
  hasMore: false,
  searchHistory: [],
  popularSearches: [],
  showSuggestions: false,
  recentSearches: [],
  resultCache: new Map(),
};

// Reducer
function searchReducer(state: SearchState, action: SearchAction): SearchState {
  switch (action.type) {
    case 'SET_QUERY':
      return { ...state, query: action.payload };

    case 'SET_SEARCHING':
      return { ...state, isSearching: action.payload };

    case 'SET_RESULTS':
      return {
        ...state,
        results: action.payload.results,
        totalResults: action.payload.total,
        suggestions: action.payload.suggestions,
        hasMore: action.payload.results.length < action.payload.total,
        error: null,
      };

    case 'SET_ERROR':
      return { ...state, error: action.payload, isSearching: false };

    case 'SET_SUGGESTIONS':
      return { ...state, suggestions: action.payload };

    case 'SET_FILTERS':
      return {
        ...state,
        filters: { ...state.filters, ...action.payload },
        currentPage: 1 // Reset page when filters change
      };

    case 'SET_PAGE':
      return { ...state, currentPage: action.payload };

    case 'SET_HISTORY':
      return { ...state, searchHistory: action.payload };

    case 'SET_POPULAR_SEARCHES':
      return { ...state, popularSearches: action.payload };

    case 'TOGGLE_SUGGESTIONS':
      return { ...state, showSuggestions: action.payload };

    case 'ADD_RECENT_SEARCH':
      const newRecentSearches = [action.payload, ...state.recentSearches.filter(s => s !== action.payload)].slice(0, 10);
      return { ...state, recentSearches: newRecentSearches };

    case 'CLEAR_RECENT_SEARCHES':
      return { ...state, recentSearches: [] };

    case 'LOAD_FROM_STORAGE':
      const stored = localStorage.getItem('search-recent-searches');
      const recentSearches = stored ? JSON.parse(stored) : [];
      return { ...state, recentSearches };

    case 'RESET_SEARCH':
      return {
        ...state,
        query: '',
        results: [],
        suggestions: [],
        currentPage: 1,
        error: null,
        showSuggestions: false,
      };

    default:
      return state;
  }
}

// Context interface
interface SearchContextType {
  state: SearchState;
  // Search actions
  setQuery: (query: string) => void;
  performSearch: (query?: string) => Promise<void>;
  loadMore: () => Promise<void>;
  getSuggestions: (query: string) => Promise<void>;

  // Filter actions
  setFilters: (filters: Partial<SearchState['filters']>) => void;

  // History actions
  clearSearchHistory: () => void;
  clearRecentSearches: () => void;

  // Utility actions
  resetSearch: () => void;
  hideSuggestions: () => void;
  showSuggestionsDropdown: () => void;
}

// Create context
const SearchContext = createContext<SearchContextType | undefined>(undefined);

// Provider component
interface SearchProviderProps {
  children: ReactNode;
}

export function SearchProvider({ children }: SearchProviderProps) {
  const [state, dispatch] = useReducer(searchReducer, initialState);

  // Load data on mount
  useEffect(() => {
    dispatch({ type: 'LOAD_FROM_STORAGE' });
    loadPopularSearches();
    loadSearchHistory();
  }, []);

  // Save recent searches to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('search-recent-searches', JSON.stringify(state.recentSearches));
  }, [state.recentSearches]);

  // Cache management
  useEffect(() => {
    // Clean old cache entries every 5 minutes
    const interval = setInterval(() => {
      const now = Date.now();
      state.resultCache.forEach((value, key) => {
        if (now - value.timestamp > 5 * 60 * 1000) {
          state.resultCache.delete(key);
        }
      });
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [state.resultCache]);

  const loadPopularSearches = async () => {
    try {
      const popularSearches = searchService.getPopularSearches();
      dispatch({ type: 'SET_POPULAR_SEARCHES', payload: popularSearches });
    } catch (error) {
      console.error('Failed to load popular searches:', error);
    }
  };

  const loadSearchHistory = async () => {
    try {
      const history = searchService.getSearchHistory();
      dispatch({ type: 'SET_HISTORY', payload: history });
    } catch (error) {
      console.error('Failed to load search history:', error);
    }
  };

  const setQuery = (query: string) => {
    dispatch({ type: 'SET_QUERY', payload: query });
    if (query.length > 0) {
      dispatch({ type: 'TOGGLE_SUGGESTIONS', payload: true });
    } else {
      dispatch({ type: 'TOGGLE_SUGGESTIONS', payload: false });
    }
  };

  const performSearch = async (query?: string) => {
    const searchQuery = query || state.query;
    if (!searchQuery.trim()) return;

    const cacheKey = `${searchQuery}-${state.filters.type}-${state.filters.sortBy}`;
    const cached = state.resultCache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < 2 * 60 * 1000) {
      dispatch({ type: 'SET_RESULTS', payload: { results: cached.results, total: cached.results.length, suggestions: [] } });
      dispatch({ type: 'ADD_RECENT_SEARCH', payload: searchQuery });
      return;
    }

    dispatch({ type: 'SET_SEARCHING', payload: true });
    dispatch({ type: 'SET_ERROR', payload: null });

    try {
      const result = await searchService.search(searchQuery, {
        type: state.filters.type,
        sortBy: state.filters.sortBy,
        limit: 20
      });

      // Cache the results
      state.resultCache.set(cacheKey, {
        results: result.results,
        timestamp: Date.now()
      });

      dispatch({ type: 'SET_RESULTS', payload: result });
      dispatch({ type: 'ADD_RECENT_SEARCH', payload: searchQuery });
      dispatch({ type: 'TOGGLE_SUGGESTIONS', payload: false });
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: 'Search failed. Please try again.' });
      console.error('Search error:', error);
    } finally {
      dispatch({ type: 'SET_SEARCHING', payload: false });
    }
  };

  const loadMore = async () => {
    if (state.isSearching || !state.hasMore) return;

    const nextPage = state.currentPage + 1;
    dispatch({ type: 'SET_PAGE', payload: nextPage });
    dispatch({ type: 'SET_SEARCHING', payload: true });

    try {
      const result = await searchService.search(state.query, {
        type: state.filters.type,
        sortBy: state.filters.sortBy,
        limit: 20 * nextPage
      });

      // Only add new results
      const newResults = result.results.slice(state.results.length);
      dispatch({
        type: 'SET_RESULTS',
        payload: {
          results: [...state.results, ...newResults],
          total: result.total,
          suggestions: []
        }
      });
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: 'Failed to load more results.' });
    } finally {
      dispatch({ type: 'SET_SEARCHING', payload: false });
    }
  };

  const getSuggestions = async (query: string) => {
    if (!query.trim()) {
      dispatch({ type: 'SET_SUGGESTIONS', payload: [] });
      return;
    }

    try {
      const suggestions = await searchService.getSuggestions(query);
      dispatch({ type: 'SET_SUGGESTIONS', payload: suggestions });
    } catch (error) {
      console.error('Failed to get suggestions:', error);
    }
  };

  const setFilters = (filters: Partial<SearchState['filters']>) => {
    dispatch({ type: 'SET_FILTERS', payload: filters });
  };

  const clearSearchHistory = () => {
    searchService.clearSearchHistory();
    dispatch({ type: 'SET_HISTORY', payload: [] });
  };

  const clearRecentSearches = () => {
    dispatch({ type: 'CLEAR_RECENT_SEARCHES' });
  };

  const resetSearch = () => {
    dispatch({ type: 'RESET_SEARCH' });
  };

  const hideSuggestions = () => {
    dispatch({ type: 'TOGGLE_SUGGESTIONS', payload: false });
  };

  const showSuggestionsDropdown = () => {
    if (state.query.length > 0) {
      dispatch({ type: 'TOGGLE_SUGGESTIONS', payload: true });
    }
  };

  const contextValue: SearchContextType = {
    state,
    setQuery,
    performSearch,
    loadMore,
    getSuggestions,
    setFilters,
    clearSearchHistory,
    clearRecentSearches,
    resetSearch,
    hideSuggestions,
    showSuggestionsDropdown,
  };

  return (
    <SearchContext.Provider value={contextValue}>
      {children}
    </SearchContext.Provider>
  );
}

// Custom hook to use search context
export function useSearch(): SearchContextType {
  const context = useContext(SearchContext);
  if (context === undefined) {
    throw new Error('useSearch must be used within a SearchProvider');
  }
  return context;
}