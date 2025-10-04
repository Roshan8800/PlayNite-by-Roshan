import {
  PermissionType,
  PermissionStatus,
  PermissionResult,
  PermissionRequest,
  PermissionState,
  PermissionEvent,
  PermissionEventListener,
  PermissionError,
  PlatformType,
  PlatformNotSupportedError,
  PermissionStatusMap,
  PermissionRequestMap
} from '../types';

import { PlatformPermissionHandler } from '../handlers/PlatformPermissionHandler';

/**
 * Centralized permission management system for mobile platforms
 * Handles permission state, requests, and platform-specific implementations
 */
export class PermissionManager {
  private static instance: PermissionManager;
  private permissionState: PermissionState = {} as PermissionState;
  private eventListeners: Map<string, PermissionEventListener[]> = new Map();
  private platformHandler: PlatformPermissionHandler;
  private isInitialized = false;

  private constructor() {
    this.platformHandler = new PlatformPermissionHandler();
  }

  /**
   * Get singleton instance of PermissionManager
   */
  public static getInstance(): PermissionManager {
    if (!PermissionManager.instance) {
      PermissionManager.instance = new PermissionManager();
    }
    return PermissionManager.instance;
  }

  /**
   * Initialize the permission manager for the current platform
   */
  public async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      await this.platformHandler.initialize();
      await this.loadPermissionState();
      this.isInitialized = true;

      this.emitEvent({
        type: 'permission_requested',
        permissionType: PermissionType.NOTIFICATIONS, // System permission check
        platform: this.getCurrentPlatform(),
        timestamp: new Date(),
        context: { action: 'initialization' }
      });
    } catch (error) {
      throw new PermissionError(
        `Failed to initialize permission manager: ${error}`,
        PermissionType.NOTIFICATIONS,
        this.getCurrentPlatform(),
        'INITIALIZATION_FAILED'
      );
    }
  }

  /**
   * Check current status of a permission
   */
  public async checkPermission(type: PermissionType): Promise<PermissionResult> {
    this.ensureInitialized();

    try {
      const result = await this.platformHandler.checkPermission(type);

      // Update internal state
      this.updatePermissionState(type, result);

      this.emitEvent({
        type: 'permission_requested',
        permissionType: type,
        platform: this.getCurrentPlatform(),
        timestamp: new Date(),
        context: { action: 'check' }
      });

      return result;
    } catch (error) {
      if (error instanceof PlatformNotSupportedError) {
        throw error;
      }

      throw new PermissionError(
        `Failed to check permission ${type}: ${error}`,
        type,
        this.getCurrentPlatform(),
        'CHECK_FAILED'
      );
    }
  }

  /**
   * Check multiple permissions at once
   */
  public async checkMultiplePermissions(types: PermissionType[]): Promise<PermissionState> {
    this.ensureInitialized();

    const results: Partial<PermissionState> = {};

    for (const type of types) {
      try {
        results[type] = await this.checkPermission(type);
      } catch (error) {
        // Log error but continue with other permissions
        console.warn(`Failed to check permission ${type}:`, error);
        results[type] = {
          type,
          status: 'unavailable',
          platform: this.getCurrentPlatform(),
          canAskAgain: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    }

    return results as PermissionState;
  }

  /**
   * Request a single permission
   */
  public async requestPermission(
    type: PermissionType,
    rationale?: string
  ): Promise<PermissionResult> {
    this.ensureInitialized();

    try {
      // Check if we can ask again first
      const currentStatus = await this.checkPermission(type);

      if (currentStatus.status === 'granted') {
        return currentStatus;
      }

      if (!currentStatus.canAskAgain && currentStatus.status === 'denied') {
        throw new PermissionError(
          `Permission ${type} was denied and cannot be requested again`,
          type,
          this.getCurrentPlatform(),
          'CANNOT_ASK_AGAIN'
        );
      }

      const request: PermissionRequest = {
        type,
        rationale,
        required: false
      };

      const result = await this.platformHandler.requestPermission(request);

      // Update internal state
      this.updatePermissionState(type, result);

      this.emitEvent({
        type: result.status === 'granted' ? 'permission_granted' : 'permission_denied',
        permissionType: type,
        platform: this.getCurrentPlatform(),
        timestamp: new Date(),
        context: { rationale, action: 'request' }
      });

      return result;
    } catch (error) {
      if (error instanceof PermissionError) {
        throw error;
      }

      throw new PermissionError(
        `Failed to request permission ${type}: ${error}`,
        type,
        this.getCurrentPlatform(),
        'REQUEST_FAILED'
      );
    }
  }

  /**
   * Request multiple permissions at once
   */
  public async requestMultiplePermissions(
    requests: PermissionRequest[]
  ): Promise<PermissionState> {
    this.ensureInitialized();

    const results: Partial<PermissionState> = {};

    for (const request of requests) {
      try {
        results[request.type] = await this.requestPermission(
          request.type,
          request.rationale
        );
      } catch (error) {
        console.warn(`Failed to request permission ${request.type}:`, error);
        results[request.type] = {
          type: request.type,
          status: 'unavailable',
          platform: this.getCurrentPlatform(),
          canAskAgain: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    }

    return results as PermissionState;
  }

  /**
   * Get all current permission states
   */
  public getAllPermissions(): PermissionState {
    return { ...this.permissionState };
  }

  /**
   * Get status of a specific permission
   */
  public getPermissionStatus(type: PermissionType): PermissionStatus | null {
    return this.permissionState[type]?.status || null;
  }

  /**
   * Check if a permission is granted
   */
  public isPermissionGranted(type: PermissionType): boolean {
    return this.permissionState[type]?.status === 'granted';
  }

  /**
   * Check if multiple permissions are granted
   */
  public arePermissionsGranted(types: PermissionType[]): boolean {
    return types.every(type => this.isPermissionGranted(type));
  }

  /**
   * Add event listener for permission events
   */
  public addEventListener(eventType: string, listener: PermissionEventListener): void {
    if (!this.eventListeners.has(eventType)) {
      this.eventListeners.set(eventType, []);
    }
    this.eventListeners.get(eventType)!.push(listener);
  }

  /**
   * Remove event listener
   */
  public removeEventListener(eventType: string, listener: PermissionEventListener): void {
    const listeners = this.eventListeners.get(eventType);
    if (listeners) {
      const index = listeners.indexOf(listener);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  /**
   * Get current platform type
   */
  private getCurrentPlatform(): PlatformType {
    // Detect platform - in a real implementation, this would use a proper detection library
    if (typeof window !== 'undefined') {
      const userAgent = window.navigator.userAgent.toLowerCase();
      if (userAgent.includes('android')) {
        return 'android';
      } else if (userAgent.includes('iphone') || userAgent.includes('ipad')) {
        return 'ios';
      }
    }
    return 'web';
  }

  /**
   * Update internal permission state
   */
  private updatePermissionState(type: PermissionType, result: PermissionResult): void {
    this.permissionState[type] = result;
    this.savePermissionState();
  }

  /**
   * Load permission state from storage
   */
  private async loadPermissionState(): Promise<void> {
    try {
      // In a real implementation, this would load from secure storage
      const stored = localStorage.getItem('playnite_permission_state');
      if (stored) {
        const parsedState = JSON.parse(stored);
        // Convert date strings back to Date objects
        Object.values(parsedState).forEach((result: any) => {
          if (result.expiresAt) {
            result.expiresAt = new Date(result.expiresAt);
          }
        });
        this.permissionState = parsedState;
      }
    } catch (error) {
      console.warn('Failed to load permission state:', error);
    }
  }

  /**
   * Save permission state to storage
   */
  private savePermissionState(): void {
    try {
      localStorage.setItem('playnite_permission_state', JSON.stringify(this.permissionState));
    } catch (error) {
      console.warn('Failed to save permission state:', error);
    }
  }

  /**
   * Emit permission event to listeners
   */
  private emitEvent(event: PermissionEvent): void {
    const listeners = this.eventListeners.get(event.type) || [];
    listeners.forEach(listener => {
      try {
        listener(event);
      } catch (error) {
        console.error('Error in permission event listener:', error);
      }
    });

    // Also emit to 'all' listeners
    const allListeners = this.eventListeners.get('all') || [];
    allListeners.forEach(listener => {
      try {
        listener(event);
      } catch (error) {
        console.error('Error in permission event listener:', error);
      }
    });
  }

  /**
   * Ensure manager is initialized
   */
  private ensureInitialized(): void {
    if (!this.isInitialized) {
      throw new PermissionError(
        'PermissionManager not initialized. Call initialize() first.',
        PermissionType.NOTIFICATIONS,
        this.getCurrentPlatform(),
        'NOT_INITIALIZED'
      );
    }
  }

  /**
   * Reset all permission states (for testing/debugging)
   */
  public async reset(): Promise<void> {
    this.permissionState = {} as PermissionState;
    localStorage.removeItem('playnite_permission_state');
    this.eventListeners.clear();
    this.isInitialized = false;
  }
}