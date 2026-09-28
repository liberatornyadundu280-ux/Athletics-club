import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { cn } from '@/utils/helpers';
import { useAuth } from '@/context/AuthContext';
import { LaneTabs } from '@/components/ui/Split';
import {
  Home,
  Users,
  Dumbbell,
  Calendar,
  Activity,
  AlertTriangle,
  FileText,
  Megaphone,
  BarChart3,
  Settings,
  Shield,
  PlusCircle,
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
    roles: ['coach', 'club_admin', 'system_admin'],
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
    id: 'attendance',
    label: 'Attendance',
    path: '/attendance',
    icon: <Calendar className="w-5 h-5" />,
    roles: ['coach', 'club_admin', 'system_admin'],
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
    injuryCount: 0, // Would come from API
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
    id: 'announcements',
    label: 'Announcements',
    path: '/announcements',
    icon: <Megaphone className="w-5 h-5" />,
    roles: ['athlete', 'coach', 'club_admin', 'system_admin'],
    permissions: ['announcement:read'],
  },
  {
    id: 'analytics',
    label: 'Analytics',
    path: '/analytics',
    icon: <BarChart3 className="w-5 h-5" />,
    roles: ['coach', 'club_admin', 'system_admin'],
    permissions: ['analytics:read'],
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
    id: 'platform-admin',
    label: 'Platform Admin',
    path: '/admin',
    icon: <Shield className="w-5 h-5" />,
    roles: ['system_admin'],
    permissions: ['*'],
  },
  {
    id: 'create-club',
    label: 'Create Club',
    path: '/admin/clubs/new',
    icon: <PlusCircle className="w-5 h-5" />,
    roles: ['system_admin'],
  },
];

export function Sidebar({ className, onNavigate }: { className?: string; onNavigate?: (path: string) => void }) {
  const location = useLocation();
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

  const filteredSystemAdminItems = systemAdminNavItems.filter(item => {
    if (item.roles && !hasRole(item.roles)) return false;
    if (item.permissions && !item.permissions.some(p => hasPermission(p))) return false;
    return true;
  });

  const allNavItems: NavItem[] = [
    ...filteredNavItems,
    ...(filteredClubAdminItems.length > 0 ? [{ id: 'admin-section', label: 'Administration', path: '', icon: <Settings className="w-5 h-5" />, children: filteredClubAdminItems }] : []),
    ...(filteredSystemAdminItems.length > 0 ? [{ id: 'system-section', label: 'System', path: '', icon: <Shield className="w-5 h-5" />, children: filteredSystemAdminItems }] : []),
  ];

  const tabs = allNavItems.map(item => ({
    id: item.id,
    label: item.label,
    count: item.injuryCount,
    icon: item.icon,
    injury: item.id === 'injuries' && (item.injuryCount || 0) > 0,
  }));

  const handleTabChange = (id: string) => {
    const item = allNavItems.find(i => i.id === id);
    if (item?.path) {
      onNavigate?.(item.path);
    }
  };

  return (
    <aside className={cn('fixed left-0 top-0 z-40 h-screen w-lane bg-track-900 border-r border-lane-700 flex flex-col transition-transform duration-300 lg:translate-x-0', className)}>
      {/* Logo */}
      <div className="h-16 px-split border-b border-lane-700 flex items-center">
        <NavLink to="/dashboard" className="flex items-center gap-3" onClick={() => onNavigate?.('/dashboard')}>
          <div className="w-8 h-8 rounded-split bg-split-500 flex items-center justify-center">
            <svg className="w-5 h-5 text-track-900" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
            </svg>
          </div>
          <span className="text-split-md font-bold text-chalk-100 tracking-tight">STMS</span>
        </NavLink>
      </div>

      {/* Navigation Lanes */}
      <nav className="flex-1 overflow-y-auto py-split px-3" aria-label="Main navigation" role="navigation">
        <LaneTabs
          tabs={tabs}
          activeId={location.pathname.split('/')[1] || 'dashboard'}
          onChange={handleTabChange}
        />
      </nav>

      {/* User info at bottom */}
      <div className="p-split border-t border-lane-700">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-lane-700 flex items-center justify-center text-chalk-100 font-medium">
            {user.name.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-body-sm font-medium text-chalk-100 truncate">
              {user.name}
            </p>
            <p className="text-caption text-chalk-400 truncate capitalize">
              {user.role.replace('_', ' ')}
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
}