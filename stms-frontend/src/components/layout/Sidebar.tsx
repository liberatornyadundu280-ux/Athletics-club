import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { cn } from '@/utils/helpers';
import { useAuth } from '@/context/AuthContext';
import {
  Home,
  Users,
  Dumbbell,
  Calendar,
  ClipboardList,
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
  label: string;
  path: string;
  icon: React.ReactNode;
  roles?: string[];
  permissions?: string[];
  children?: NavItem[];
}

const navigationConfig: NavItem[] = [
  {
    label: 'Dashboard',
    path: '/dashboard',
    icon: <Home className="w-5 h-5" />,
    roles: ['athlete', 'coach', 'club_admin', 'system_admin'],
  },
  {
    label: 'Athletes',
    path: '/athletes',
    icon: <Users className="w-5 h-5" />,
    roles: ['coach', 'club_admin', 'system_admin'],
    permissions: ['athlete:read'],
  },
  {
    label: 'Workouts',
    path: '/workouts',
    icon: <Dumbbell className="w-5 h-5" />,
    roles: ['athlete', 'coach', 'club_admin', 'system_admin'],
    permissions: ['workout:read'],
  },
  {
    label: 'Attendance',
    path: '/attendance',
    icon: <Calendar className="w-5 h-5" />,
    roles: ['coach', 'club_admin', 'system_admin'],
    permissions: ['attendance:read'],
  },
  {
    label: 'Performance',
    path: '/performance',
    icon: <Activity className="w-5 h-5" />,
    roles: ['athlete', 'coach', 'club_admin', 'system_admin'],
    permissions: ['performance:read'],
  },
  {
    label: 'Injuries',
    path: '/injuries',
    icon: <AlertTriangle className="w-5 h-5" />,
    roles: ['coach', 'club_admin', 'system_admin'],
    permissions: ['injury:read'],
  },
  {
    label: 'Permissions',
    path: '/permissions',
    icon: <FileText className="w-5 h-5" />,
    roles: ['coach', 'club_admin', 'system_admin'],
    permissions: ['permission:read'],
  },
  {
    label: 'Announcements',
    path: '/announcements',
    icon: <Megaphone className="w-5 h-5" />,
    roles: ['athlete', 'coach', 'club_admin', 'system_admin'],
    permissions: ['announcement:read'],
  },
  {
    label: 'Analytics',
    path: '/analytics',
    icon: <BarChart3 className="w-5 h-5" />,
    roles: ['coach', 'club_admin', 'system_admin'],
    permissions: ['analytics:read'],
  },
];

// Club Admin only items
const clubAdminNavItems: NavItem[] = [
  {
    label: 'User Management',
    path: '/settings/users',
    icon: <Shield className="w-5 h-5" />,
    roles: ['club_admin', 'system_admin'],
    permissions: ['user:read'],
  },
  {
    label: 'Club Settings',
    path: '/settings/club',
    icon: <Settings className="w-5 h-5" />,
    roles: ['club_admin', 'system_admin'],
    permissions: ['club:settings'],
  },
];

// System Admin only items
const systemAdminNavItems: NavItem[] = [
  {
    label: 'Platform Admin',
    path: '/admin',
    icon: <Shield className="w-5 h-5" />,
    roles: ['system_admin'],
    permissions: ['*'],
  },
  {
    label: 'Create Club',
    path: '/admin/clubs/new',
    icon: <PlusCircle className="w-5 h-5" />,
    roles: ['system_admin'],
  },
];

export function Sidebar() {
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

  const allNavItems = [
    ...filteredNavItems,
    ...(filteredClubAdminItems.length > 0 ? [{ label: 'Administration', path: '', icon: <Settings className="w-5 h-5" />, children: filteredClubAdminItems }] : []),
    ...(filteredSystemAdminItems.length > 0 ? [{ label: 'System', path: '', icon: <Shield className="w-5 h-5" />, children: filteredSystemAdminItems }] : []),
  ];

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-64 bg-white dark:bg-surface-950 border-r border-surface-200 dark:border-surface-800 flex flex-col transition-transform duration-300 lg:translate-x-0">
      {/* Logo */}
      <div className="flex items-center justify-between h-16 px-4 border-b border-surface-200 dark:border-surface-800">
        <NavLink to="/dashboard" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary-800 flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
            </svg>
          </div>
          <span className="text-heading-md font-bold text-surface-900 dark:text-surface-100">STMS</span>
        </NavLink>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-3" aria-label="Main navigation">
        <ul className="space-y-1" role="list">
          {allNavItems.map((item, index) => (
            <React.Fragment key={item.path || item.label + index}>
              {item.children ? (
                <CollapsibleNavItem item={item} location={location} />
              ) : (
                <NavItemComponent item={item} location={location} />
              )}
            </React.Fragment>
          ))}
        </ul>
      </nav>

      {/* User info at bottom */}
      <div className="p-4 border-t border-surface-200 dark:border-surface-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary-100 dark:bg-primary-900 flex items-center justify-center text-primary-800 dark:text-primary-200 font-medium">
            {user.name.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-body-sm font-medium text-surface-900 dark:text-surface-100 truncate">
              {user.name}
            </p>
            <p className="text-caption text-surface-500 dark:text-surface-400 truncate capitalize">
              {user.role.replace('_', ' ')}
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
}

function NavItemComponent({ item, location }: { item: NavItem; location: Location }) {
  const isActive = location.pathname === item.path || location.pathname.startsWith(item.path + '/');

  return (
    <li>
      <NavLink
        to={item.path}
        className={({ isActive }) => cn(
          'flex items-center gap-3 px-3 py-2.5 rounded-lg text-body font-medium transition-colors',
          isActive
            ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-800 dark:text-primary-300'
            : 'text-surface-600 dark:text-surface-400 hover:bg-surface-100 dark:hover:bg-surface-800'
        )}
        aria-current={isActive ? 'page' : undefined}
      >
        <span className={cn('flex-shrink-0', isActive ? 'text-primary-800 dark:text-primary-300' : 'text-surface-400')}>
          {item.icon}
        </span>
        <span className="truncate">{item.label}</span>
        {isActive && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-primary-500" />}
      </NavLink>
    </li>
  );
}

function CollapsibleNavItem({ item, location }: { item: NavItem; location: Location }) {
  const [isOpen, setIsOpen] = React.useState(false);
  const isActive = item.children?.some(child => location.pathname === child.path || location.pathname.startsWith(child.path + '/'));

  // Auto-open if any child is active
  React.useEffect(() => {
    if (isActive) setIsOpen(true);
  }, [isActive]);

  return (
    <li>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'flex items-center justify-between w-full px-3 py-2.5 rounded-lg text-body font-medium transition-colors',
          isActive
            ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-800 dark:text-primary-300'
            : 'text-surface-600 dark:text-surface-400 hover:bg-surface-100 dark:hover:bg-surface-800'
        )}
        aria-expanded={isOpen}
      >
        <span className="flex items-center gap-3">
          <span className={cn('flex-shrink-0', isActive ? 'text-primary-800 dark:text-primary-300' : 'text-surface-400')}>
            {item.icon}
          </span>
          <span className="truncate">{item.label}</span>
        </span>
        <svg
          className={cn('w-4 h-4 transition-transform', isOpen ? 'rotate-180' : '')}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {isOpen && (
        <ul className="ml-8 mt-1 space-y-1" role="list">
          {item.children?.map(child => (
            <li key={child.path}>
              <NavLink
                to={child.path}
                className={({ isActive }) => cn(
                  'flex items-center gap-3 px-3 py-2 rounded-lg text-body-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-800 dark:text-primary-300'
                    : 'text-surface-600 dark:text-surface-400 hover:bg-surface-100 dark:hover:bg-surface-800'
                )}
              >
                <span className="w-5" />
                {child.icon && <span className="flex-shrink-0 w-5 text-surface-400">{child.icon}</span>}
                <span className="truncate">{child.label}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}