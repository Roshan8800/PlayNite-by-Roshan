'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  PermissionType,
  PermissionRequest,
  PermissionResult,
  PermissionState,
  FallbackBehavior
} from '../types';

import { PermissionManager } from '../core/PermissionManager';
import { FeatureAccessController } from '../core/FeatureAccessController';

/**
 * Hook for managing permissions in React components
 */
export function usePermissions() {
  const [permissionManager] = useState(() => PermissionManager.getInstance());
  const [featureController] = useState(() => FeatureAccessController.getInstance());
  const [isInitialized, setIsInitialized] = useState(false);
  const [permissionStates, setPermissionStates] = useState<PermissionState>({} as PermissionState);

  // Initialize permission system
  useEffect(() => {
    const initialize = async () => {
      try {
        await permissionManager.initialize();
        await featureController.initialize();

        // Load current permission states
        const allPermissions = Object.values(PermissionType);
        const states = await permissionManager.checkMultiplePermissions(allPermissions);
        setPermissionStates(states);

        setIsInitialized(true);
      } catch (error) {
        console.error('Failed to initialize permissions:', error);
      }
    };

    initialize();
  }, [permissionManager, featureController]);

  /**
   * Check if a permission is granted
   */
  const isPermissionGranted = useCallback((type: PermissionType): boolean => {
    return permissionStates[type]?.status === 'granted';
  }, [permissionStates]);

  /**
   * Check if multiple permissions are granted
   */
  const arePermissionsGranted = useCallback((types: PermissionType[]): boolean => {
    return types.every(type => isPermissionGranted(type));
  }, [isPermissionGranted]);

  /**
   * Request a single permission
   */
  const requestPermission = useCallback(async (
    type: PermissionType,
    rationale?: string
  ): Promise<PermissionResult> => {
    try {
      const result = await permissionManager.requestPermission(type, rationale);

      // Update local state
      setPermissionStates(prev => ({
        ...prev,
        [type]: result
      }));

      return result;
    } catch (error) {
      console.error(`Failed to request permission ${type}:`, error);
      throw error;
    }
  }, [permissionManager]);

  /**
   * Request multiple permissions
   */
  const requestMultiplePermissions = useCallback(async (
    requests: PermissionRequest[]
  ): Promise<PermissionState> => {
    try {
      const results = await permissionManager.requestMultiplePermissions(requests);

      // Update local state
      setPermissionStates(prev => ({
        ...prev,
        ...results
      }));

      return results;
    } catch (error) {
      console.error('Failed to request multiple permissions:', error);
      throw error;
    }
  }, [permissionManager]);

  /**
   * Check if a feature can be accessed
   */
  const canAccessFeature = useCallback(async (featureName: string): Promise<boolean> => {
    try {
      return await featureController.canAccessFeature(featureName);
    } catch (error) {
      console.error(`Failed to check feature access ${featureName}:`, error);
      return false;
    }
  }, [featureController]);

  /**
   * Get feature access information
   */
  const getFeatureAccessInfo = useCallback(async (featureName: string) => {
    try {
      return await featureController.getFeatureAccessInfo(featureName);
    } catch (error) {
      console.error(`Failed to get feature access info ${featureName}:`, error);
      return {
        canAccess: false,
        reason: 'Failed to check feature access'
      };
    }
  }, [featureController]);

  /**
   * Get fallback behavior for a feature
   */
  const getFallbackBehavior = useCallback((featureName: string): FallbackBehavior | null => {
    return featureController.getFallbackBehavior(featureName);
  }, [featureController]);

  /**
   * Check if feature has platform-specific configuration
   */
  const hasPlatformConfig = useCallback((featureName: string, platform: 'ios' | 'android' | 'web'): boolean => {
    return featureController.hasPlatformConfig(featureName, platform);
  }, [featureController]);

  return {
    isInitialized,
    permissionStates,
    isPermissionGranted,
    arePermissionsGranted,
    requestPermission,
    requestMultiplePermissions,
    canAccessFeature,
    getFeatureAccessInfo,
    getFallbackBehavior,
    hasPlatformConfig
  };
}

/**
 * Hook for requesting permissions with UI state management
 */
export function usePermissionRequest() {
  const [isRequesting, setIsRequesting] = useState(false);
  const [requestResults, setRequestResults] = useState<Map<PermissionType, PermissionResult>>(new Map());

  const { requestPermission, requestMultiplePermissions } = usePermissions();

  /**
   * Request a single permission with loading state
   */
  const requestPermissionWithState = useCallback(async (
    type: PermissionType,
    rationale?: string
  ): Promise<PermissionResult> => {
    setIsRequesting(true);
    try {
      const result = await requestPermission(type, rationale);
      setRequestResults(prev => new Map(prev).set(type, result));
      return result;
    } finally {
      setIsRequesting(false);
    }
  }, [requestPermission]);

  /**
   * Request multiple permissions with loading state
   */
  const requestMultiplePermissionsWithState = useCallback(async (
    requests: PermissionRequest[]
  ): Promise<PermissionState> => {
    setIsRequesting(true);
    try {
      const results = await requestMultiplePermissions(requests);

      // Update results map
      const newResults = new Map<PermissionType, PermissionResult>();
      Object.entries(results).forEach(([type, result]) => {
        newResults.set(type as PermissionType, result);
      });
      setRequestResults(newResults);

      return results;
    } finally {
      setIsRequesting(false);
    }
  }, [requestMultiplePermissions]);

  /**
   * Get request result for a specific permission
   */
  const getRequestResult = useCallback((type: PermissionType): PermissionResult | null => {
    return requestResults.get(type) || null;
  }, [requestResults]);

  /**
   * Check if a permission request was successful
   */
  const isPermissionRequestSuccessful = useCallback((type: PermissionType): boolean => {
    const result = getRequestResult(type);
    return result?.status === 'granted';
  }, [getRequestResult]);

  /**
   * Get all granted permissions from recent requests
   */
  const getGrantedPermissions = useCallback((): PermissionType[] => {
    return Array.from(requestResults.entries())
      .filter(([, result]) => result.status === 'granted')
      .map(([type]) => type);
  }, [requestResults]);

  /**
   * Get all denied permissions from recent requests
   */
  const getDeniedPermissions = useCallback((): PermissionType[] => {
    return Array.from(requestResults.entries())
      .filter(([, result]) => result.status === 'denied')
      .map(([type]) => type);
  }, [requestResults]);

  return {
    isRequesting,
    requestResults,
    requestPermissionWithState,
    requestMultiplePermissionsWithState,
    getRequestResult,
    isPermissionRequestSuccessful,
    getGrantedPermissions,
    getDeniedPermissions
  };
}

/**
 * Hook for feature access with automatic fallback handling
 */
export function useFeatureAccess(featureName: string) {
  const [accessInfo, setAccessInfo] = useState<{
    canAccess: boolean;
    reason?: string;
    fallbackBehavior?: FallbackBehavior;
    missingPermissions?: PermissionType[];
  } | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const { canAccessFeature, getFeatureAccessInfo } = usePermissions();

  // Load feature access info on mount
  useEffect(() => {
    const loadAccessInfo = async () => {
      setIsLoading(true);
      try {
        const info = await getFeatureAccessInfo(featureName);
        setAccessInfo(info);
      } catch (error) {
        console.error(`Failed to load access info for feature ${featureName}:`, error);
        setAccessInfo({
          canAccess: false,
          reason: 'Failed to check feature access'
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadAccessInfo();
  }, [featureName, getFeatureAccessInfo]);

  /**
   * Refresh feature access info
   */
  const refreshAccessInfo = useCallback(async () => {
    setIsLoading(true);
    try {
      const info = await getFeatureAccessInfo(featureName);
      setAccessInfo(info);
    } catch (error) {
      console.error(`Failed to refresh access info for feature ${featureName}:`, error);
    } finally {
      setIsLoading(false);
    }
  }, [featureName, getFeatureAccessInfo]);

  /**
   * Check if feature can be accessed
   */
  const checkAccess = useCallback(async (): Promise<boolean> => {
    try {
      return await canAccessFeature(featureName);
    } catch (error) {
      console.error(`Failed to check access for feature ${featureName}:`, error);
      return false;
    }
  }, [featureName, canAccessFeature]);

  return {
    accessInfo,
    isLoading,
    canAccess: accessInfo?.canAccess || false,
    reason: accessInfo?.reason,
    fallbackBehavior: accessInfo?.fallbackBehavior,
    missingPermissions: accessInfo?.missingPermissions || [],
    refreshAccessInfo,
    checkAccess
  };
}