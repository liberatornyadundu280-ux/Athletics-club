import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { cn } from '@/utils/helpers';
import { useAuth } from '@/context/AuthContext';
import { VTabs, VTabProps } from '@/components/ui/Split';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import {
  Home,
  Users,
  Dumbbell,
  Calendar,
  Activity,
  AlertTriangle,
  FileText,
  BarChart3,
  Megaphone,
  Settings,
  Shield,
  Sparkles,
} from 'lucide-react';

interface NavItem {
  id: string;
  label: string;
  path: string;
  icon: React.ReactNode;
  roles?: string[];
  permissions?: string[];
  children?: NavItem[];
  injuryCount?: number;
}

const navigationConfig: NavItem[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    path: '/dashboard',
    icon: <Home className="w-5 h-5" />,
    roles: ['athlete', 'coach', 'club_admin', 'system_admin'],
  },
  {
    id: 'athletes',
    label: 'Athletes',
    path: '/athletes',
    icon: <Users className="w-5 h-5" />,
    roles: ['athlete', 'coach', 'club_admin', 'system_admin'],
    permissions: ['athlete:read'],
  },
  {
    id: 'workouts',
    label: 'Workouts',
    path: '/workouts',
    icon: <Dumbbell className="w-5 h-5" />,
    roles: ['athlete', 'coach', 'club_admin', 'system_admin'],
    permissions: ['workout:read'],
  },
  {
    id: 'recommendations',
    label: 'Smart Plan',
    path: '/recommendations',
    icon: <Sparkles className="w-5 h-5" />,
    roles: ['athlete', 'coach', 'club_admin', 'system_admin'],
    permissions: ['workout:read'],
  },
  {
    id: 'attendance',
    label: 'Attendance',
    path: '/attendance',
    icon: <Calendar className="w-5 h-5" />,
    roles: ['athlete', 'coach', 'club_admin', 'system_admin'],
    permissions: ['attendance:read'],
  },
  {
    id: 'performance',
    label: 'Performance',
    path: '/performance',
    icon: <Activity className="w-5 h-5" />,
    roles: ['athlete', 'coach', 'club_admin', 'system_admin'],
    permissions: ['performance:read'],
  },
  {
    id: 'injuries',
    label: 'Injuries',
    path: '/injuries',
    icon: <AlertTriangle className="w-5 h-5" />,
    roles: ['coach', 'club_admin', 'system_admin'],
    permissions: ['injury:read'],
    injuryCount: 0,
  },
  {
    id: 'permissions',
    label: 'Permissions',
    path: '/permissions',
    icon: <FileText className="w-5 h-5" />,
    roles: ['coach', 'club_admin', 'system_admin'],
    permissions: ['permission:read'],
  },
  {
    id: 'analytics',
    label: 'Analytics',
    path: '/analytics',
    icon: <BarChart3 className="w-5 h-5" />,
    roles: ['coach', 'club_admin', 'system_admin'],
    permissions: ['analytics:read'],
  },
  {
    id: 'announcements',
    label: 'Announcements',
    path: '/announcements',
    icon: <Megaphone className="w-5 h-5" />,
    roles: ['athlete', 'coach', 'club_admin', 'system_admin'],
    permissions: ['announcement:read'],
  },
];

const clubAdminNavItems: NavItem[] = [
  {
    id: 'users',
    label: 'User Management',
    path: '/settings/users',
    icon: <Shield className="w-5 h-5" />,
    roles: ['club_admin', 'system_admin'],
    permissions: ['user:read'],
  },
  {
    id: 'club-settings',
    label: 'Club Settings',
    path: '/settings/club',
    icon: <Settings className="w-5 h-5" />,
    roles: ['club_admin', 'system_admin'],
    permissions: ['club:settings'],
  },
];

const systemAdminNavItems: NavItem[] = [
  {
    id: 'platform-users',
    label: 'Platform Users',
    path: '/admin/users',
    icon: <Shield className="w-5 h-5" />,
    roles: ['system_admin'],
  },
];

interface SidebarProps {
  className?: string;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

export function Sidebar({ className, collapsed = false, onToggleCollapse }: SidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, hasPermission, hasRole } = useAuth();

  if (!user) return null;

  const filteredNavItems = navigationConfig.filter(item => {
    if (item.roles && !hasRole(item.roles)) return false;
    if (item.permissions && !item.permissions.some(p => hasPermission(p))) return false;
    return true;
  });

  const filteredClubAdminItems = clubAdminNavItems.filter(item => {
    if (item.roles && !hasRole(item.roles)) return false;
    if (item.permissions && !item.permissions.some(p => hasPermission(p))) return false;
    return true;
  });

  const filteredSystemAdminItems = systemAdminNavItems.filter(item => item.roles && hasRole(item.roles));
  const allNavItems: NavItem[] = [...filteredNavItems, ...filteredClubAdminItems, ...filteredSystemAdminItems];

  const tabs = allNavItems.map(item => ({
    id: item.id,
    label: item.label,
    count: item.injuryCount,
    icon: item.icon,
    variant: item.id === 'injuries' && (item.injuryCount || 0) > 0 ? 'danger' as const : 'default' as const,
  }));

  const handleTabChange = (id: string) => {
    const item = allNavItems.find(i => i.id === id);
    if (item?.path) {
      navigate(item.path);
    }
  };

  const currentItem = allNavItems.find(item => location.pathname === item.path || location.pathname.startsWith(`${item.path}/`));
  const currentPath = currentItem?.id || location.pathname.split('/')[1] || 'dashboard';

  const sidebarWidth = collapsed ? 'w-lane-sm' : 'w-lane';
  const logoText = collapsed ? null : <span className="text-display-sm font-bold text-text-primary tracking-tight">STMS</span>;

  return (
    <aside className={cn(
      'fixed left-0 top-0 z-40 h-screen bg-track-900 border-r border-border flex flex-col transition-all duration-300 lg:translate-x-0',
      sidebarWidth,
      className
    )}>
      {/* Logo & Collapse Toggle */}
      <div className="h-16 px-space-md border-b border-border flex items-center justify-between">
        <button
          onClick={() => navigate('/dashboard')}
          className="flex items-center gap-3 w-full text-left"
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
        >
          <div className="w-8 h-8 rounded-radius-md bg-sky-500 flex items-center justify-center flex-shrink-0">
            <svg className="w-5 h-5 text-track-900" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
            </svg>
          </div>
          {logoText}
        </button>
        <button
          onClick={onToggleCollapse}
          className="p-1.5 rounded-radius-md text-text-secondary hover:text-text-primary hover:bg-cold-800 transition-colors lg:hidden"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          aria-expanded={!collapsed}
        >
          {collapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
        </button>
      </div>

      {/* Navigation Lanes */}
      <nav className="flex-1 overflow-y-auto py-space-md px-space-md" aria-label="Main navigation" role="navigation">
        {!collapsed && <VTabs
          tabs={tabs}
          activeId={currentPath}
          onChange={handleTabChange}
        />}
        {collapsed && (
          <div className="flex flex-col gap-1">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={cn(
                  'v-tab relative',
                  currentPath === tab.id && 'v-tab-active',
                  tab.variant === 'danger' && 'v-tab-danger'
                )}
                aria-label={tab.label}
                aria-current={currentPath === tab.id ? 'page' : undefined}
              >
                <span className="flex items-center justify-center w-full">
                  {tab.icon}
                </span>
                {tab.count !== undefined && tab.count > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-danger-500 text-white text-[10px] font-medium flex items-center justify-center">
                    {tab.count > 9 ? '9+' : tab.count}
                  </span>
                )}
                <div className="absolute left-full top-0 w-40 p-2 bg-track-900 border border-border rounded-radius-md shadow-shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-150 z-50 whitespace-nowrap">
                  {tab.label}
                </div>
              </button>
            ))}
          </div>
        )}
      </nav>

      {/* User info at bottom */}
      <div className={cn('p-space-md border-t border-border transition-all duration-300', collapsed && 'px-space-md')}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-cold-700 flex items-center justify-center text-text-primary font-medium flex-shrink-0">
            {user.name.charAt(0).toUpperCase()}
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-body-sm font-medium text-text-primary truncate">
                {user.name}
              </p>
              <p className="text-caption text-text-muted truncate capitalize">
                {user.role.replace('_', ' ')}
              </p>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
