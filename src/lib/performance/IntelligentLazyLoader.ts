export interface LazyLoadElement {
  id: string;
  element: Element;
  priority: number;
  contentType: 'image' | 'video' | 'text' | 'mixed';
  estimatedSize: number;
  position: { x: number; y: number; width: number; height: number };
  metadata?: {
    src?: string;
    poster?: string;
    alt?: string;
    loading?: 'lazy' | 'eager' | 'auto';
  };
}

export interface LazyLoadConfig {
  rootMargin: string;
  threshold: number;
  maxConcurrent: number;
  networkAware: boolean;
  batteryAware: boolean;
  userBehaviorAware: boolean;
  predictiveLoading: boolean;
  intersectionThreshold: number;
  priorityWeights: {
    viewport: number;
    userBehavior: number;
    contentType: number;
    networkSpeed: number;
    batteryLevel: number;
  };
}

export interface UserBehaviorPattern {
  scrollVelocity: number;
  scrollDirection: 'up' | 'down' | 'stationary';
  timeOnPage: number;
  interactionHistory: string[];
  preferredContentTypes: string[];
  sessionDuration: number;
  viewportTime: Map<string, number>; // elementId -> time in viewport
}

export interface ViewportContext {
  scrollY: number;
  windowHeight: number;
  windowWidth: number;
  devicePixelRatio: number;
  orientation: 'portrait' | 'landscape';
  zoomLevel: number;
}

export interface LoadingQueueItem {
  element: LazyLoadElement;
  priority: number;
  estimatedLoadTime: number;
  deadline?: number;
  dependencies?: string[];
}

export class IntelligentLazyLoader {
  private observer: IntersectionObserver | null = null;
  private mutationObserver: MutationObserver | null = null;
  private elements = new Map<string, LazyLoadElement>();
  private loadingQueue: LoadingQueueItem[] = [];
  private currentlyLoading = new Set<string>();
  private userBehavior: UserBehaviorPattern;
  private viewportContext: ViewportContext;
  private config: LazyLoadConfig;
  private performanceHistory: Array<{
    timestamp: number;
    loadTime: number;
    elementId: string;
    priority: number;
  }> = [];

  constructor(config: Partial<LazyLoadConfig> = {}) {
    this.config = {
      rootMargin: '50px',
      threshold: 0.1,
      maxConcurrent: 3,
      networkAware: true,
      batteryAware: true,
      userBehaviorAware: true,
      predictiveLoading: true,
      intersectionThreshold: 0.5,
      priorityWeights: {
        viewport: 0.3,
        userBehavior: 0.25,
        contentType: 0.2,
        networkSpeed: 0.15,
        batteryLevel: 0.1
      },
      ...config
    };

    this.userBehavior = this.initializeUserBehavior();
    this.viewportContext = this.getViewportContext();

    this.initializeObserver();
    this.initializeMutationObserver();
    this.startBehaviorTracking();
    this.startViewportTracking();
  }

  /**
   * Register element for intelligent lazy loading
   */
  registerElement(element: LazyLoadElement): () => void {
    this.elements.set(element.id, element);

    if (this.observer && element.element) {
      this.observer.observe(element.element);
    }

    // Calculate initial priority
    element.priority = this.calculatePriority(element);

    return () => {
      this.unregisterElement(element.id);
    };
  }

  /**
   * Unregister element from lazy loading
   */
  unregisterElement(elementId: string): void {
    const element = this.elements.get(elementId);
    if (element && this.observer) {
      this.observer.unobserve(element.element);
    }

    this.elements.delete(elementId);
    this.currentlyLoading.delete(elementId);

    // Remove from loading queue
    this.loadingQueue = this.loadingQueue.filter(item => item.element.id !== elementId);
  }

  /**
   * Force load specific element
   */
  async forceLoad(elementId: string): Promise<void> {
    const element = this.elements.get(elementId);
    if (!element || this.currentlyLoading.has(elementId)) return;

    await this.loadElement(element);
  }

  /**
   * Get current loading statistics
   */
  getLoadingStats(): {
    totalElements: number;
    loadedElements: number;
    loadingQueueSize: number;
    averageLoadTime: number;
    hitRate: number;
  } {
    const totalElements = this.elements.size;
    const loadedElements = this.performanceHistory.length;
    const averageLoadTime = this.performanceHistory.length > 0
      ? this.performanceHistory.reduce((sum, item) => sum + item.loadTime, 0) / this.performanceHistory.length
      : 0;

    // Calculate hit rate (elements that were actually viewed after loading)
    const viewedElements = this.performanceHistory.filter(item => {
      const element = this.elements.get(item.elementId);
      return element && this.wasElementViewed(element);
    }).length;

    const hitRate = loadedElements > 0 ? viewedElements / loadedElements : 0;

    return {
      totalElements,
      loadedElements,
      loadingQueueSize: this.loadingQueue.length,
      averageLoadTime,
      hitRate
    };
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<LazyLoadConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.recalculatePriorities();
  }

  /**
   * Initialize intersection observer
   */
  private initializeObserver(): void {
    if (typeof window === 'undefined') return;

    this.observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          this.handleIntersection(entry);
        });
      },
      {
        rootMargin: this.config.rootMargin,
        threshold: this.config.threshold
      }
    );
  }

  /**
   * Initialize mutation observer for DOM changes
   */
  private initializeMutationObserver(): void {
    if (typeof window === 'undefined') return;

    this.mutationObserver = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          this.scanForLazyElements(node as Element);
        });
      });
    });

    this.mutationObserver.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  /**
   * Handle intersection events
   */
  private handleIntersection(entry: IntersectionObserverEntry): void {
    const elementId = this.getElementIdFromEntry(entry);
    if (!elementId) return;

    const element = this.elements.get(elementId);
    if (!element) return;

    if (entry.isIntersecting) {
      // Element entered viewport
      this.onElementVisible(element, entry);
    } else {
      // Element left viewport
      this.onElementHidden(element);
    }
  }

  /**
   * Handle element becoming visible
   */
  private onElementVisible(element: LazyLoadElement, entry: IntersectionObserverEntry): void {
    // Update viewport tracking
    this.updateViewportTracking(element.id);

    // Check if we should load immediately or queue for intelligent loading
    if (this.shouldLoadImmediately(element)) {
      this.loadElement(element);
    } else {
      this.addToLoadingQueue(element, entry);
    }
  }

  /**
   * Handle element becoming hidden
   */
  private onElementHidden(element: LazyLoadElement): void {
    // Update behavior tracking
    this.updateBehaviorTracking(element.id, 'hidden');
  }

  /**
   * Check if element should be loaded immediately
   */
  private shouldLoadImmediately(element: LazyLoadElement): boolean {
    // High priority elements
    if (element.priority > 0.8) return true;

    // Elements in critical viewport area
    const viewportPriority = this.calculateViewportPriority(element);
    if (viewportPriority > 0.9) return true;

    // Network conditions allow immediate loading
    if (!this.config.networkAware || this.getNetworkConditions().speed === 'fast') {
      return true;
    }

    return false;
  }

  /**
   * Add element to intelligent loading queue
   */
  private addToLoadingQueue(element: LazyLoadElement, entry: IntersectionObserverEntry): void {
    const priority = this.calculateDynamicPriority(element, entry);
    const estimatedLoadTime = this.estimateLoadTime(element);

    const queueItem: LoadingQueueItem = {
      element,
      priority,
      estimatedLoadTime,
      deadline: this.calculateDeadline(element, priority)
    };

    // Insert in priority order
    const insertIndex = this.loadingQueue.findIndex(item => item.priority < priority);
    if (insertIndex === -1) {
      this.loadingQueue.push(queueItem);
    } else {
      this.loadingQueue.splice(insertIndex, 0, queueItem);
    }

    this.processLoadingQueue();
  }

  /**
   * Process the loading queue
   */
  private processLoadingQueue(): void {
    if (this.currentlyLoading.size >= this.config.maxConcurrent) {
      return;
    }

    // Sort by priority and deadline
    this.loadingQueue.sort((a, b) => {
      const priorityDiff = b.priority - a.priority;
      if (Math.abs(priorityDiff) > 0.1) return priorityDiff;

      // If priorities are similar, use deadline
      if (a.deadline && b.deadline) {
        return a.deadline - b.deadline;
      }

      return 0;
    });

    // Load next items
    while (
      this.currentlyLoading.size < this.config.maxConcurrent &&
      this.loadingQueue.length > 0
    ) {
      const nextItem = this.loadingQueue.shift();
      if (nextItem && this.shouldStillLoad(nextItem.element)) {
        this.loadElement(nextItem.element);
      }
    }
  }

  /**
   * Load element content
   */
  private async loadElement(element: LazyLoadElement): Promise<void> {
    if (this.currentlyLoading.has(element.id)) return;

    this.currentlyLoading.add(element.id);

    try {
      const startTime = performance.now();

      // Check network and battery conditions
      if (!await this.checkLoadingConditions(element)) {
        this.currentlyLoading.delete(element.id);
        return;
      }

      // Load based on content type
      await this.loadContentByType(element);

      const loadTime = performance.now() - startTime;

      // Record performance metrics
      this.performanceHistory.push({
        timestamp: Date.now(),
        loadTime,
        elementId: element.id,
        priority: element.priority
      });

      // Keep only recent history
      if (this.performanceHistory.length > 1000) {
        this.performanceHistory = this.performanceHistory.slice(-500);
      }

      this.currentlyLoading.delete(element.id);

      // Continue processing queue
      this.processLoadingQueue();

    } catch (error) {
      console.error('Failed to load element:', element.id, error);
      this.currentlyLoading.delete(element.id);
    }
  }

  /**
   * Load content based on type
   */
  private async loadContentByType(element: LazyLoadElement): Promise<void> {
    switch (element.contentType) {
      case 'image':
        await this.loadImage(element);
        break;
      case 'video':
        await this.loadVideo(element);
        break;
      case 'text':
        await this.loadText(element);
        break;
      case 'mixed':
        await this.loadMixedContent(element);
        break;
    }
  }

  /**
   * Load image content
   */
  private async loadImage(element: LazyLoadElement): Promise<void> {
    if (!element.metadata?.src) return;

    const img = document.createElement('img');
    img.src = element.metadata.src;
    img.alt = element.metadata.alt || '';
    img.loading = (element.metadata.loading === 'auto' ? 'lazy' : element.metadata.loading) || 'lazy';

    // Add to element
    if (element.element) {
      element.element.appendChild(img);
    }

    // Wait for load
    return new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('Failed to load image'));
    });
  }

  /**
   * Load video content
   */
  private async loadVideo(element: LazyLoadElement): Promise<void> {
    if (!element.metadata?.src) return;

    const video = document.createElement('video');
    video.src = element.metadata.src;
    video.poster = element.metadata.poster || '';
    video.preload = 'metadata';
    video.playsInline = true;

    if (element.element) {
      element.element.appendChild(video);
    }
  }

  /**
   * Load text content
   */
  private async loadText(element: LazyLoadElement): Promise<void> {
    // For text content, we might need to fetch from API
    if (element.metadata?.src) {
      const response = await fetch(element.metadata.src);
      const text = await response.text();

      if (element.element) {
        element.element.textContent = text;
      }
    }
  }

  /**
   * Load mixed content
   */
  private async loadMixedContent(element: LazyLoadElement): Promise<void> {
    // Load multiple content types
    await Promise.all([
      this.loadImage(element),
      this.loadText(element)
    ]);
  }

  /**
   * Calculate element priority
   */
  private calculatePriority(element: LazyLoadElement): number {
    const viewportPriority = this.calculateViewportPriority(element);
    const behaviorPriority = this.calculateBehaviorPriority(element);
    const contentPriority = this.calculateContentPriority(element);
    const networkPriority = this.calculateNetworkPriority();
    const batteryPriority = this.calculateBatteryPriority();

    return (
      viewportPriority * this.config.priorityWeights.viewport +
      behaviorPriority * this.config.priorityWeights.userBehavior +
      contentPriority * this.config.priorityWeights.contentType +
      networkPriority * this.config.priorityWeights.networkSpeed +
      batteryPriority * this.config.priorityWeights.batteryLevel
    );
  }

  /**
   * Calculate dynamic priority with intersection context
   */
  private calculateDynamicPriority(element: LazyLoadElement, entry: IntersectionObserverEntry): number {
    const basePriority = element.priority;
    const intersectionRatio = entry.intersectionRatio;
    const viewportPriority = this.calculateViewportPriority(element);

    // Boost priority for elements with high intersection ratio
    const intersectionBoost = intersectionRatio > 0.5 ? 0.2 : 0;

    // Boost priority for elements in critical viewport area
    const criticalAreaBoost = viewportPriority > 0.8 ? 0.3 : 0;

    return Math.min(1, basePriority + intersectionBoost + criticalAreaBoost);
  }

  /**
   * Calculate viewport-based priority
   */
  private calculateViewportPriority(element: LazyLoadElement): number {
    const context = this.viewportContext;
    const elementCenterY = element.position.y + element.position.height / 2;
    const viewportCenter = context.scrollY + context.windowHeight / 2;

    // Distance from viewport center (normalized)
    const distance = Math.abs(elementCenterY - viewportCenter);
    const maxDistance = context.windowHeight;
    const distanceRatio = Math.min(distance / maxDistance, 1);

    // Closer to center = higher priority
    return Math.max(0, 1 - distanceRatio);
  }

  /**
   * Calculate behavior-based priority
   */
  private calculateBehaviorPriority(element: LazyLoadElement): number {
    const contentType = element.contentType;
    const preferredTypes = this.userBehavior.preferredContentTypes;

    // Boost priority for preferred content types
    if (preferredTypes.includes(contentType)) {
      return 0.8;
    }

    // Check interaction history
    const interactionScore = this.getInteractionScore(element.id);
    return Math.min(0.9, interactionScore * 0.7);
  }

  /**
   * Calculate content type priority
   */
  private calculateContentPriority(element: LazyLoadElement): number {
    const priorities = {
      video: 0.9,
      image: 0.7,
      mixed: 0.8,
      text: 0.5
    };

    return priorities[element.contentType] || 0.5;
  }

  /**
   * Calculate network-based priority
   */
  private calculateNetworkPriority(): number {
    const conditions = this.getNetworkConditions();

    switch (conditions.speed) {
      case 'fast': return 1.0;
      case 'medium': return 0.7;
      case 'slow': return 0.3;
      default: return 0.5;
    }
  }

  /**
   * Calculate battery-based priority
   */
  private calculateBatteryPriority(): number {
    const battery = this.getBatteryInfo();

    if (battery.level > 0.5) return 1.0;
    if (battery.level > 0.2) return 0.7;
    return 0.3;
  }

  /**
   * Estimate load time for element
   */
  private estimateLoadTime(element: LazyLoadElement): number {
    // Base time on content type and size
    const baseTimes = {
      image: 500,
      video: 2000,
      text: 200,
      mixed: 1500
    };

    const baseTime = baseTimes[element.contentType] || 500;
    const sizeMultiplier = Math.min(element.estimatedSize / (1024 * 1024), 3); // Cap at 3x for large files

    return baseTime * (1 + sizeMultiplier * 0.5);
  }

  /**
   * Calculate loading deadline
   */
  private calculateDeadline(element: LazyLoadElement, priority: number): number {
    // Higher priority = sooner deadline
    const urgency = Math.max(0.1, priority);
    const baseDeadline = 5000; // 5 seconds base

    return Date.now() + (baseDeadline / urgency);
  }

  /**
   * Check if element should still be loaded
   */
  private shouldStillLoad(element: LazyLoadElement): boolean {
    // Check if element is still in viewport or near viewport
    const viewportPriority = this.calculateViewportPriority(element);
    return viewportPriority > 0.2;
  }

  /**
   * Check loading conditions
   */
  private async checkLoadingConditions(element: LazyLoadElement): Promise<boolean> {
    if (this.config.networkAware) {
      const network = this.getNetworkConditions();
      if (network.speed === 'slow' && element.priority < 0.5) {
        return false;
      }
    }

    if (this.config.batteryAware) {
      const battery = this.getBatteryInfo();
      if (battery.level < 0.2 && !battery.charging && element.priority < 0.7) {
        return false;
      }
    }

    return true;
  }

  /**
   * Get element ID from intersection entry
   */
  private getElementIdFromEntry(entry: IntersectionObserverEntry): string | null {
    const element = entry.target as HTMLElement;
    return element.dataset.lazyId || element.id || null;
  }

  /**
   * Initialize user behavior tracking
   */
  private initializeUserBehavior(): UserBehaviorPattern {
    return {
      scrollVelocity: 0,
      scrollDirection: 'stationary',
      timeOnPage: 0,
      interactionHistory: [],
      preferredContentTypes: [],
      sessionDuration: 0,
      viewportTime: new Map()
    };
  }

  /**
   * Get viewport context
   */
  private getViewportContext(): ViewportContext {
    if (typeof window === 'undefined') {
      return {
        scrollY: 0,
        windowHeight: 800,
        windowWidth: 1200,
        devicePixelRatio: 1,
        orientation: 'landscape',
        zoomLevel: 1
      };
    }

    return {
      scrollY: window.scrollY,
      windowHeight: window.innerHeight,
      windowWidth: window.innerWidth,
      devicePixelRatio: window.devicePixelRatio || 1,
      orientation: window.innerWidth > window.innerHeight ? 'landscape' : 'portrait',
      zoomLevel: 1
    };
  }

  /**
   * Get network conditions
   */
  private getNetworkConditions(): { speed: 'slow' | 'medium' | 'fast' } {
    if (typeof navigator !== 'undefined' && 'connection' in navigator) {
      const connection = (navigator as any).connection;
      if (connection.effectiveType) {
        const speed = connection.effectiveType;
        if (speed === 'slow-2g' || speed === '2g') return { speed: 'slow' };
        if (speed === '3g') return { speed: 'medium' };
        return { speed: 'fast' };
      }
    }
    return { speed: 'medium' };
  }

  /**
   * Get battery information
   */
  private getBatteryInfo(): { level: number; charging: boolean } {
    // Simplified battery info - in real implementation, use Battery API
    return { level: 1, charging: true };
  }

  /**
   * Get interaction score for element
   */
  private getInteractionScore(elementId: string): number {
    // Check if user has interacted with similar elements
    const element = this.elements.get(elementId);
    if (!element) return 0;

    const contentType = element.contentType;
    const interactionCount = this.userBehavior.interactionHistory.filter(
      interaction => interaction.includes(contentType)
    ).length;

    return Math.min(1, interactionCount / 10); // Normalize to 0-1
  }

  /**
   * Check if element was actually viewed
   */
  private wasElementViewed(element: LazyLoadElement): boolean {
    const viewportTime = this.userBehavior.viewportTime.get(element.id) || 0;
    return viewportTime > 1000; // Viewed for more than 1 second
  }

  /**
   * Start behavior tracking
   */
  private startBehaviorTracking(): void {
    if (typeof window === 'undefined') return;

    let lastScrollY = window.scrollY;
    let lastScrollTime = Date.now();

    const trackScroll = () => {
      const now = Date.now();
      const currentScrollY = window.scrollY;
      const timeDiff = now - lastScrollTime;

      if (timeDiff > 0) {
        const scrollDiff = currentScrollY - lastScrollY;
        this.userBehavior.scrollVelocity = Math.abs(scrollDiff / timeDiff);

        if (scrollDiff > 0) {
          this.userBehavior.scrollDirection = 'down';
        } else if (scrollDiff < 0) {
          this.userBehavior.scrollDirection = 'up';
        } else {
          this.userBehavior.scrollDirection = 'stationary';
        }
      }

      lastScrollY = currentScrollY;
      lastScrollTime = now;
    };

    window.addEventListener('scroll', trackScroll, { passive: true });

    // Track page time
    const trackTime = () => {
      this.userBehavior.timeOnPage = Date.now() - (window as any).pageStartTime || 0;
    };

    setInterval(trackTime, 1000);
  }

  /**
   * Start viewport tracking
   */
  private startViewportTracking(): void {
    if (typeof window === 'undefined') return;

    const updateViewport = () => {
      this.viewportContext = this.getViewportContext();
    };

    window.addEventListener('resize', updateViewport);
    window.addEventListener('orientationchange', updateViewport);

    // Update viewport context periodically
    setInterval(updateViewport, 5000);
  }

  /**
   * Update viewport tracking for element
   */
  private updateViewportTracking(elementId: string): void {
    const startTime = Date.now();

    const trackVisibility = () => {
      const element = this.elements.get(elementId);
      if (!element) return;

      const endTime = Date.now();
      const viewportTime = this.userBehavior.viewportTime.get(elementId) || 0;
      this.userBehavior.viewportTime.set(elementId, viewportTime + (endTime - startTime));
    };

    // Track for a short period
    setTimeout(trackVisibility, 1000);
  }

  /**
   * Update behavior tracking
   */
  private updateBehaviorTracking(elementId: string, event: string): void {
    this.userBehavior.interactionHistory.push(`${elementId}:${event}:${Date.now()}`);

    // Keep only recent history
    if (this.userBehavior.interactionHistory.length > 100) {
      this.userBehavior.interactionHistory = this.userBehavior.interactionHistory.slice(-50);
    }
  }

  /**
   * Recalculate priorities for all elements
   */
  private recalculatePriorities(): void {
    for (const element of this.elements.values()) {
      element.priority = this.calculatePriority(element);
    }
  }

  /**
   * Scan for lazy load elements in DOM
   */
  private scanForLazyElements(root: Element): void {
    const lazyElements = root.querySelectorAll('[data-lazy-id], [data-src]');

    lazyElements.forEach((element) => {
      const id = element.id || (element as HTMLElement).dataset.lazyId;
      if (!id || this.elements.has(id)) return;

      const lazyElement: LazyLoadElement = {
        id,
        element,
        priority: 0,
        contentType: this.detectContentType(element),
        estimatedSize: this.estimateElementSize(element),
        position: this.getElementPosition(element),
        metadata: {
          src: (element as HTMLElement).dataset.src,
          poster: (element as HTMLElement).dataset.poster,
          alt: (element as HTMLElement).dataset.alt,
          loading: (element as HTMLElement).dataset.loading as any || 'lazy'
        }
      };

      this.registerElement(lazyElement);
    });
  }

  /**
   * Detect content type from element
   */
  private detectContentType(element: Element): LazyLoadElement['contentType'] {
    if (element.tagName === 'IMG') return 'image';
    if (element.tagName === 'VIDEO') return 'video';
    if (element.textContent && element.textContent.length > 100) return 'text';
    return 'mixed';
  }

  /**
   * Estimate element size
   */
  private estimateElementSize(element: Element): number {
    const rect = element.getBoundingClientRect();
    return rect.width * rect.height * 3; // Rough estimate in bytes
  }

  /**
   * Get element position
   */
  private getElementPosition(element: Element): { x: number; y: number; width: number; height: number } {
    const rect = element.getBoundingClientRect();
    return {
      x: rect.left + window.scrollX,
      y: rect.top + window.scrollY,
      width: rect.width,
      height: rect.height
    };
  }
}