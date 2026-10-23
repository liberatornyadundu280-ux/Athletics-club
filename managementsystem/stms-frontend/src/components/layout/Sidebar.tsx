import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { cn } from '@/utils/helpers';
import { useAuth } from '@/context/AuthContext';
import { VTab } from '@/components/ui/Split';
import { ChevronLeft, ChevronRight, Zap } from 'lucide-react';
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
}

interface NavGroup {
  id: string;
  label: string | null;
  items: NavItem[];
}

const navigationGroups: NavGroup[] = [
  {
    id: 'workspace',
    label: null,
    items: [
      {
        id: 'dashboard',
        label: 'Today',
        path: '/dashboard',
        icon: <Home className="h-[18px] w-[18px]" />,
        roles: ['athlete', 'coach', 'club_admin', 'system_admin'],
      },
    ],
  },
  {
    id: 'training',
    label: 'Training',
    items: [
      {
        id: 'athletes',
        label: 'Athletes',
        path: '/athletes',
        icon: <Users className="h-[18px] w-[18px]" />,
        roles: ['athlete', 'coach', 'club_admin', 'system_admin'],
        permissions: ['athlete:read'],
      },
      {
        id: 'workouts',
        label: 'Workouts',
        path: '/workouts',
        icon: <Dumbbell className="h-[18px] w-[18px]" />,
        roles: ['athlete', 'coach', 'club_admin', 'system_admin'],
        permissions: ['workout:read'],
      },
      {
        id: 'recommendations',
        label: 'Smart plan',
        path: '/recommendations',
        icon: <Sparkles className="h-[18px] w-[18px]" />,
        roles: ['athlete', 'coach', 'club_admin', 'system_admin'],
        permissions: ['workout:read'],
      },
      {
        id: 'attendance',
        label: 'Attendance',
        path: '/attendance',
        icon: <Calendar className="h-[18px] w-[18px]" />,
        roles: ['athlete', 'coach', 'club_admin', 'system_admin'],
        permissions: ['attendance:read'],
      },
      {
        id: 'performance',
        label: 'Performance',
        path: '/performance',
        icon: <Activity className="h-[18px] w-[18px]" />,
        roles: ['athlete', 'coach', 'club_admin', 'system_admin'],
        permissions: ['performance:read'],
      },
    ],
  },
  {
    id: 'care',
    label: 'Athlete care',
    items: [
      {
        id: 'injuries',
        label: 'Injuries',
        path: '/injuries',
        icon: <AlertTriangle className="h-[18px] w-[18px]" />,
        roles: ['coach', 'club_admin', 'system_admin'],
        permissions: ['injury:read'],
      },
      {
        id: 'permissions',
        label: 'Permissions',
        path: '/permissions',
        icon: <FileText className="h-[18px] w-[18px]" />,
        roles: ['coach', 'club_admin', 'system_admin'],
        permissions: ['permission:read'],
      },
    ],
  },
  {
    id: 'club',
    label: 'Club',
    items: [
      {
        id: 'analytics',
        label: 'Analytics',
        path: '/analytics',
        icon: <BarChart3 className="h-[18px] w-[18px]" />,
        roles: ['coach', 'club_admin', 'system_admin'],
        permissions: ['analytics:read'],
      },
      {
        id: 'announcements',
        label: 'Announcements',
        path: '/announcements',
        icon: <Megaphone className="h-[18px] w-[18px]" />,
        roles: ['athlete', 'coach', 'club_admin', 'system_admin'],
        permissions: ['announcement:read'],
      },
    ],
  },
  {
    id: 'admin',
    label: 'Administration',
    items: [
      {
        id: 'users',
        label: 'User management',
        path: '/settings/users',
        icon: <Shield className="h-[18px] w-[18px]" />,
        roles: ['club_admin', 'system_admin'],
        permissions: ['user:read'],
      },
      {
        id: 'club-settings',
        label: 'Club settings',
        path: '/settings/club',
        icon: <Settings className="h-[18px] w-[18px]" />,
        roles: ['club_admin', 'system_admin'],
        permissions: ['club:settings'],
      },
      {
        id: 'platform-users',
        label: 'Platform users',
        path: '/admin/users',
        icon: <Shield className="h-[18px] w-[18px]" />,
        roles: ['system_admin'],
      },
    ],
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

  // Guests see the full module list so they can explore what the platform does before
  // creating an account. Administration stays hidden — those destinations only lead to a
  // permission redirect.
  const isGuest = !user;

  const visible = (item: NavItem) => {
    if (isGuest) return true;
    if (item.roles && !hasRole(item.roles)) return false;
    if (item.permissions && !item.permissions.some(p => hasPermission(p))) return false;
    return true;
  };

  const groups = navigationGroups
    .filter(group => !isGuest || group.id !== 'admin')
    .map(group => ({ ...group, items: group.items.filter(visible) }))
    .filter(group => group.items.length > 0);

  const allItems = groups.flatMap(group => group.items);

  const currentItem = allItems.find(
    item => location.pathname === item.path || location.pathname.startsWith(`${item.path}/`)
  );

  const sidebarWidth = collapsed ? 'w-lane-sm' : 'w-lane';

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 z-40 flex h-screen flex-col border-r border-border bg-coal transition-all duration-300 lg:translate-x-0',
        sidebarWidth,
        className
      )}
    >
      {/* Brand */}
      <div className={cn('flex h-14 shrink-0 items-center border-b border-border', collapsed ? 'justify-center px-2' : 'justify-between px-3')}>
        <button
          onClick={() => navigate('/dashboard')}
          className="group flex items-center gap-2.5 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-volt/70 focus-visible:ring-offset-2 focus-visible:ring-offset-coal"
          aria-label="STMS home"
        >
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-volt text-ink transition-transform duration-300 group-hover:rotate-[-8deg]">
            <Zap size={17} strokeWidth={2.8} />
          </span>
          {!collapsed && (
            <span className="font-display text-lg tracking-[0.02em] text-text-primary">
              ST<span className="text-volt">M</span>S
            </span>
          )}
        </button>
        {!collapsed && onToggleCollapse && (
          <button
            onClick={onToggleCollapse}
            className="hidden rounded-md p-1.5 text-text-muted transition-colors hover:bg-white/[0.05] hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-volt/70 lg:grid"
            aria-label="Collapse sidebar"
            aria-expanded={!collapsed}
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-2 py-3" aria-label="Main navigation">
        {groups.map(group => (
          <div key={group.id} className="mb-4 last:mb-0">
            {!collapsed && group.label && <p className="section-label mb-1.5 px-2.5">{group.label}</p>}
            <div className="space-y-0.5">
              {group.items.map(item => {
                const active = currentItem?.id === item.id;

                if (collapsed) {
                  return (
                    <button
                      key={item.id}
                      onClick={() => navigate(item.path)}
                      className={cn(
                        'group relative flex w-full items-center justify-center rounded-md py-2.5 transition-colors',
                        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-volt/70',
                        active ? 'bg-white/[0.06] text-volt' : 'text-text-secondary hover:bg-white/[0.04] hover:text-text-primary'
                      )}
                      aria-label={item.label}
                      aria-current={active ? 'page' : undefined}
                    >
                      {item.icon}
                      <span className="pointer-events-none absolute left-full z-50 ml-2 hidden whitespace-nowrap rounded-md border border-border bg-surface px-2 py-1 text-caption text-text-primary shadow-shadow-lg group-hover:block">
                        {item.label}
                      </span>
                    </button>
                  );
                }

                return (
                  <VTab
                    key={item.id}
                    label={item.label}
                    icon={item.icon}
                    active={active}
                    onClick={() => navigate(item.path)}
                    aria-current={active ? 'page' : undefined}
                  />
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Account */}
      <div className="shrink-0 border-t border-border p-2">
        <div className={cn('flex items-center gap-2.5 rounded-md px-1.5 py-1.5', collapsed && 'justify-center')}>
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-volt/10 text-body-sm font-semibold text-volt">
            {user ? user.name.charAt(0).toUpperCase() : <Zap size={15} strokeWidth={2.4} />}
          </span>
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <p className="truncate text-body-sm font-medium text-text-primary">
                {user ? user.name : 'Browsing as guest'}
              </p>
              {user ? (
                <p className="truncate text-caption capitalize text-text-muted">{user.role.replace('_', ' ')}</p>
              ) : (
                <button
                  onClick={() => navigate('/login')}
                  className="text-caption font-medium text-volt hover:underline"
                >
                  Sign in
                </button>
              )}
            </div>
          )}
        </div>

        {collapsed && onToggleCollapse && (
          <button
            onClick={onToggleCollapse}
            className="mt-1 hidden w-full items-center justify-center rounded-md py-1.5 text-text-muted transition-colors hover:bg-white/[0.05] hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-volt/70 lg:flex"
            aria-label="Expand sidebar"
            aria-expanded={!collapsed}
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        )}
      </div>
    </aside>
  );
}
