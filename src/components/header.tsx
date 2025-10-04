"use client";

import { Search, Bell, Clock, TrendingUp, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { PlayNiteLogo } from "./playnite-logo";
import { PlaceHolderImages } from "@/lib/placeholder-images";
import { useAuth } from "@/contexts/AuthContext";
import { useSearch } from "@/contexts/SearchContext";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

export function Header() {
  const { user, signOut, loading } = useAuth();
  const router = useRouter();
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  const {
    state,
    setQuery,
    performSearch,
    getSuggestions,
    hideSuggestions,
    showSuggestionsDropdown,
    resetSearch,
    clearRecentSearches
  } = useSearch();

  const avatar = PlaceHolderImages.find(img => img.id === 'avatar-1');

  const handleLogout = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const handleSearchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (state.query.trim()) {
      await performSearch();
      router.push(`/search?q=${encodeURIComponent(state.query)}`);
      hideSuggestions();
    }
  };

  const handleSuggestionClick = async (suggestion: string) => {
    setQuery(suggestion);
    await performSearch(suggestion);
    router.push(`/search?q=${encodeURIComponent(suggestion)}`);
    hideSuggestions();
  };

  const handleRecentSearchClick = async (recentSearch: string) => {
    setQuery(recentSearch);
    await performSearch(recentSearch);
    router.push(`/search?q=${encodeURIComponent(recentSearch)}`);
    hideSuggestions();
  };

  const handleClearSearch = () => {
    setQuery('');
    resetSearch();
    searchInputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      hideSuggestions();
      searchInputRef.current?.blur();
    }
  };

  // Get suggestions when query changes
  useEffect(() => {
    if (state.query.length > 0) {
      getSuggestions(state.query);
    }
  }, [state.query, getSuggestions]);

  if (loading) {
    return (
      <header className="flex h-16 items-center gap-4 border-b bg-card/50 px-4 md:px-6">
        <div className="md:hidden">
          <div className="h-10 w-10 animate-pulse bg-muted rounded" />
        </div>
        <div className="hidden md:block">
          <div className="h-8 w-32 animate-pulse bg-muted rounded" />
        </div>
        <div className="flex w-full items-center gap-4 md:ml-auto md:gap-2 lg:gap-4">
          <div className="h-10 w-[300px] animate-pulse bg-muted rounded" />
          <div className="h-10 w-10 animate-pulse bg-muted rounded-full" />
          <div className="h-10 w-10 animate-pulse bg-muted rounded-full" />
        </div>
      </header>
    );
  }

  return (
    <header className="flex h-16 items-center gap-4 border-b bg-card/50 px-4 md:px-6 sticky top-0 z-30 backdrop-blur-sm">
      <div className="md:hidden">
        <SidebarTrigger />
      </div>
      <div className="hidden md:block">
        <Link href="/home">
            <PlayNiteLogo />
        </Link>
      </div>

      {/* Enhanced Search Bar */}
      <div className="flex w-full items-center gap-4 md:ml-auto md:gap-2 lg:gap-4">
        <form onSubmit={handleSearchSubmit} className="ml-auto flex-1 sm:flex-initial relative">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              ref={searchInputRef}
              type="search"
              placeholder="Search videos, reels, images, and more..."
              value={state.query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => {
                setIsSearchFocused(true);
                showSuggestionsDropdown();
              }}
              onBlur={() => {
                setIsSearchFocused(false);
                // Delay hiding suggestions to allow clicking on them
                setTimeout(() => hideSuggestions(), 200);
              }}
              onKeyDown={handleKeyDown}
              className="pl-8 pr-20 sm:w-[300px] md:w-[200px] lg:w-[400px]"
            />

            {/* Search Actions */}
            <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center gap-1">
              {state.query && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleClearSearch}
                  className="h-6 w-6 p-0 hover:bg-muted"
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
              <Button
                type="submit"
                size="sm"
                disabled={!state.query.trim() || state.isSearching}
                className="h-6 px-2 text-xs"
              >
                {state.isSearching ? '...' : 'Search'}
              </Button>
            </div>
          </div>

          {/* Search Suggestions Dropdown */}
          {state.showSuggestions && (state.suggestions.length > 0 || state.recentSearches.length > 0) && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-popover border rounded-md shadow-lg z-50 max-h-96 overflow-auto">
              {/* Recent Searches */}
              {state.recentSearches.length > 0 && (
                <div className="p-2">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      Recent Searches
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={clearRecentSearches}
                      className="h-6 text-xs text-muted-foreground hover:text-foreground"
                    >
                      Clear
                    </Button>
                  </div>
                  {state.recentSearches.slice(0, 3).map((recentSearch, index) => (
                    <button
                      key={index}
                      onClick={() => handleRecentSearchClick(recentSearch)}
                      className="w-full text-left px-3 py-2 hover:bg-muted rounded-sm flex items-center gap-2 text-sm"
                    >
                      <Clock className="h-3 w-3 text-muted-foreground" />
                      {recentSearch}
                    </button>
                  ))}
                </div>
              )}

              {/* Search Suggestions */}
              {state.suggestions.length > 0 && (
                <div className="border-t p-2">
                  <div className="flex items-center gap-1 mb-2 text-xs text-muted-foreground">
                    <Search className="h-3 w-3" />
                    Suggestions
                  </div>
                  {state.suggestions.map((suggestion) => (
                    <button
                      key={suggestion.id}
                      onClick={() => handleSuggestionClick(suggestion.text)}
                      className="w-full text-left px-3 py-2 hover:bg-muted rounded-sm flex items-center justify-between text-sm"
                    >
                      <div className="flex items-center gap-2">
                        {suggestion.type === 'tag' && <span className="text-xs text-primary">🏷️</span>}
                        {suggestion.type === 'user' && <span className="text-xs text-blue-500">👤</span>}
                        {suggestion.type === 'category' && <span className="text-xs text-green-500">📁</span>}
                        {suggestion.text}
                      </div>
                      {suggestion.count && (
                        <span className="text-xs text-muted-foreground">
                          {suggestion.count.toLocaleString()}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )}

              {/* Popular Searches */}
              {state.popularSearches.length > 0 && !state.query && (
                <div className="border-t p-2">
                  <div className="flex items-center gap-1 mb-2 text-xs text-muted-foreground">
                    <TrendingUp className="h-3 w-3" />
                    Trending
                  </div>
                  {state.popularSearches.slice(0, 4).map((popular) => (
                    <button
                      key={popular.id}
                      onClick={() => handleSuggestionClick(popular.query)}
                      className="w-full text-left px-3 py-2 hover:bg-muted rounded-sm flex items-center justify-between text-sm"
                    >
                      <span>{popular.query}</span>
                      {popular.trending && (
                        <span className="text-xs text-orange-500">🔥</span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </form>

        <Button variant="ghost" size="icon" className="rounded-full">
            <Bell className="h-5 w-5"/>
            <span className="sr-only">Toggle notifications</span>
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="rounded-full">
              <Avatar className="h-8 w-8">
                {avatar && <AvatarImage src={avatar.imageUrl} alt="User" data-ai-hint={avatar.imageHint} />}
                <AvatarFallback>U</AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>
              {user?.email || user?.displayName || 'My Account'}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild><Link href="/settings">Settings</Link></DropdownMenuItem>
            <DropdownMenuItem>Support</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout}>Logout</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
