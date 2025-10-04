'use client';

import React, { Suspense, lazy } from 'react';
import { PanelType, UserRole, Permission } from '../types';
import { panelManager } from './PanelManager';
import { accessControlManager } from '../managers/AccessControlManager';
import { BasePanel } from '../components/BasePanel';

/**
 * PanelRouter Component
 * Handles routing and rendering of different panel types with proper access control
 */
interface PanelRouterProps {
  panelType: PanelType;
  userId: string;
  userRole?: UserRole;
  userPermissions?: Permission[];
  sessionId?: string;
  fallback?: React.ReactNode;
  onPanelLoad?: (panelType: PanelType) => void;
  onPanelError?: (error: Error) => void;
}

// Lazy load panel components for better performance
const AdminDashboardPanel = lazy(() => import('../components/AdminDashboardPanel'));
const UserSettingsPanel = lazy(() => import('../components/UserSettingsPanel'));

export function PanelRouter({
  panelType,
  userId,
  userRole,
  userPermissions = [],
  sessionId,
  fallback,
  onPanelLoad,
  onPanelError
}: PanelRouterProps) {
  // Get panel configuration
  const config = panelManager.getPanelConfiguration(panelType);

  // Check if panel is enabled
  if (!panelManager.isPanelEnabled(panelType)) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <h3 className="text-lg font-semibold">Panel Unavailable</h3>
          <p className="text-muted-foreground">This panel is currently disabled.</p>
        </div>
      </div>
    );
  }

  // Check permissions if provided
  if (userRole && userPermissions.length > 0) {
    const hasAccess = accessControlManager.canAccessPanel(userId, panelType);
    if (!hasAccess) {
      return (
        <div className="flex items-center justify-center p-8">
          <div className="text-center">
            <h3 className="text-lg font-semibold">Access Denied</h3>
            <p className="text-muted-foreground">You don't have permission to access this panel.</p>
          </div>
        </div>
      );
    }
  }

  // Render appropriate panel component
  const renderPanel = () => {
    const commonProps = {
      userId,
      sessionId,
      key: `${panelType}_${sessionId || 'default'}`
    };

    switch (panelType) {
      case PanelType.ADMIN_DASHBOARD:
        return (
          <Suspense fallback={fallback || <PanelLoadingFallback />}>
            <AdminDashboardPanel {...commonProps} />
          </Suspense>
        );

      case PanelType.USER_SETTINGS:
        return (
          <Suspense fallback={fallback || <PanelLoadingFallback />}>
            <UserSettingsPanel {...commonProps} />
          </Suspense>
        );

      case PanelType.MODERATION_QUEUE:
        return (
          <BasePanel panelType={panelType} userId={userId} sessionId={sessionId}>
            <ModerationQueuePanelContent />
          </BasePanel>
        );

      case PanelType.ANALYTICS_DASHBOARD:
        return (
          <BasePanel panelType={panelType} userId={userId} sessionId={sessionId}>
            <AnalyticsDashboardPanelContent />
          </BasePanel>
        );

      case PanelType.CONTENT_MANAGEMENT:
        return (
          <BasePanel panelType={panelType} userId={userId} sessionId={sessionId}>
            <ContentManagementPanelContent />
          </BasePanel>
        );

      case PanelType.USER_MANAGEMENT:
        return (
          <BasePanel panelType={panelType} userId={userId} sessionId={sessionId}>
            <UserManagementPanelContent />
          </BasePanel>
        );

      case PanelType.SYSTEM_SETTINGS:
        return (
          <BasePanel panelType={panelType} userId={userId} sessionId={sessionId}>
            <SystemSettingsPanelContent />
          </BasePanel>
        );

      case PanelType.AUDIT_LOGS:
        return (
          <BasePanel panelType={panelType} userId={userId} sessionId={sessionId}>
            <AuditLogsPanelContent />
          </BasePanel>
        );

      default:
        return (
          <div className="flex items-center justify-center p-8">
            <div className="text-center">
              <h3 className="text-lg font-semibold">Unknown Panel</h3>
              <p className="text-muted-foreground">Panel type "{panelType}" is not recognized.</p>
            </div>
          </div>
        );
    }
  };

  // Call onPanelLoad callback
  React.useEffect(() => {
    if (onPanelLoad) {
      onPanelLoad(panelType);
    }
  }, [panelType, onPanelLoad]);

  return (
    <div className="panel-router">
      <ErrorBoundary onError={onPanelError}>
        {renderPanel()}
      </ErrorBoundary>
    </div>
  );
}

/**
 * Panel Loading Fallback Component
 */
function PanelLoadingFallback() {
  return (
    <div className="space-y-4 p-6">
      <div className="animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
        <div className="h-4 bg-gray-200 rounded w-1/2 mb-6"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-32 bg-gray-200 rounded"></div>
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * Error Boundary for Panel Components
 */
class ErrorBoundary extends React.Component<
  { children: React.ReactNode; onError?: (error: Error) => void },
  { hasError: boolean; error?: Error }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Panel Error:', error, errorInfo);
    if (this.props.onError) {
      this.props.onError(error);
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center p-8">
          <div className="text-center">
            <h3 className="text-lg font-semibold text-red-600">Panel Error</h3>
            <p className="text-muted-foreground">Something went wrong loading this panel.</p>
            <button
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              onClick={() => this.setState({ hasError: false })}
            >
              Try Again
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Panel Content Components
 * These would be implemented as separate components for each panel type
 */
function ModerationQueuePanelContent() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Moderation Queue</h2>
        <div className="flex gap-2">
          <button className="px-3 py-1 text-sm border rounded">Filter</button>
          <button className="px-3 py-1 text-sm border rounded">Bulk Actions</button>
        </div>
      </div>
      <div className="bg-gray-50 p-8 text-center">
        <p className="text-muted-foreground">Moderation queue content would be implemented here</p>
      </div>
    </div>
  );
}

function AnalyticsDashboardPanelContent() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Analytics Dashboard</h2>
        <div className="flex gap-2">
          <select className="px-3 py-1 text-sm border rounded">
            <option>Last 7 days</option>
            <option>Last 30 days</option>
            <option>Last 90 days</option>
          </select>
        </div>
      </div>
      <div className="bg-gray-50 p-8 text-center">
        <p className="text-muted-foreground">Analytics dashboard content would be implemented here</p>
      </div>
    </div>
  );
}

function ContentManagementPanelContent() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Content Management</h2>
        <button className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
          Create Content
        </button>
      </div>
      <div className="bg-gray-50 p-8 text-center">
        <p className="text-muted-foreground">Content management content would be implemented here</p>
      </div>
    </div>
  );
}

function UserManagementPanelContent() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">User Management</h2>
        <div className="flex gap-2">
          <button className="px-3 py-1 text-sm border rounded">Export</button>
          <button className="px-3 py-1 text-sm border rounded">Import</button>
        </div>
      </div>
      <div className="bg-gray-50 p-8 text-center">
        <p className="text-muted-foreground">User management content would be implemented here</p>
      </div>
    </div>
  );
}

function SystemSettingsPanelContent() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">System Settings</h2>
        <button className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700">
          Save Changes
        </button>
      </div>
      <div className="bg-gray-50 p-8 text-center">
        <p className="text-muted-foreground">System settings content would be implemented here</p>
      </div>
    </div>
  );
}

function AuditLogsPanelContent() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Audit Logs</h2>
        <div className="flex gap-2">
          <button className="px-3 py-1 text-sm border rounded">Export</button>
          <button className="px-3 py-1 text-sm border rounded">Filter</button>
        </div>
      </div>
      <div className="bg-gray-50 p-8 text-center">
        <p className="text-muted-foreground">Audit logs content would be implemented here</p>
      </div>
    </div>
  );
}

/**
 * Panel Navigation Component
 * Provides navigation between different panels
 */
interface PanelNavigationProps {
  currentPanel: PanelType;
  availablePanels: PanelType[];
  onPanelChange: (panelType: PanelType) => void;
  userId: string;
}

export function PanelNavigation({
  currentPanel,
  availablePanels,
  onPanelChange,
  userId
}: PanelNavigationProps) {
  return (
    <nav className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
      {availablePanels.map((panelType) => {
        const config = panelManager.getPanelConfiguration(panelType);
        if (!config) return null;

        return (
          <button
            key={panelType}
            onClick={() => onPanelChange(panelType)}
            className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
              currentPanel === panelType
                ? 'bg-white text-gray-900 shadow'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {config.title}
          </button>
        );
      })}
    </nav>
  );
}

/**
 * Panel Container Component
 * Main container that handles panel routing and state management
 */
interface PanelContainerProps {
  initialPanel?: PanelType;
  userId: string;
  userRole?: UserRole;
  userPermissions?: Permission[];
  className?: string;
}

export function PanelContainer({
  initialPanel = PanelType.USER_SETTINGS,
  userId,
  userRole,
  userPermissions = [],
  className = ''
}: PanelContainerProps) {
  const [currentPanel, setCurrentPanel] = React.useState<PanelType>(initialPanel);
  const [sessionId] = React.useState(() => `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);

  // Get available panels for the user
  const availablePanels = panelManager.getAvailablePanels(userId);

  const handlePanelChange = (panelType: PanelType) => {
    setCurrentPanel(panelType);
  };

  return (
    <div className={`panel-container ${className}`}>
      {/* Panel Navigation */}
      <div className="mb-6">
        <PanelNavigation
          currentPanel={currentPanel}
          availablePanels={availablePanels}
          onPanelChange={handlePanelChange}
          userId={userId}
        />
      </div>

      {/* Panel Content */}
      <PanelRouter
        panelType={currentPanel}
        userId={userId}
        userRole={userRole}
        userPermissions={userPermissions}
        sessionId={sessionId}
        onPanelLoad={(panelType) => {
          console.log(`Panel loaded: ${panelType}`);
        }}
        onPanelError={(error) => {
          console.error('Panel error:', error);
        }}
      />
    </div>
  );
}

export default PanelRouter;