import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  Sparkles,
  BookOpen,
  Compass,
  Calendar,
  PenTool,
  ChevronLeft,
  ChevronRight,
  Zap,
  ClipboardList,
  HardDrive,
  Code2,
  BarChart3,
  Users,
  Settings,
  Trophy,
} from 'lucide-react';

interface NavItem {
  label: string;
  path: string;
  icon: React.FC<{ className?: string }>;
  badge?: string;
}

// STUDENT nav: exactly 9 items — no Landing, no Institution Admin
const STUDENT_NAV: NavItem[] = [
  { label: 'Dashboard',            path: '/dashboard',         icon: LayoutDashboard },
  { label: 'Identity Twin',        path: '/identity-twin',     icon: Sparkles,    badge: '88%' },
  { label: 'Learning Curation',    path: '/learning',          icon: BookOpen },
  { label: 'Knowledge Base',       path: '/knowledge-base',    icon: HardDrive,   badge: 'FAISS' },
  { label: 'Growth Opportunities', path: '/opportunities',     icon: Compass,     badge: 'AI Match' },
  { label: 'Daily Planner',        path: '/planner',           icon: Calendar },
  { label: 'Reflection',           path: '/reflection',        icon: PenTool },
  { label: 'Assessments',          path: '/assessments',       icon: ClipboardList },
  { label: 'Coding Contest',       path: '/contest',           icon: Code2,       badge: 'Live' },
];

// ADMIN nav: 6 dedicated items — no student pages
const ADMIN_NAV: NavItem[] = [
  { label: 'Overview / Analytics', path: '/institution/overview',            icon: BarChart3 },
  { label: 'Cohorts',              path: '/institution/cohorts',             icon: Users },
  { label: 'Schedule Assessment',  path: '/institution/schedule-assessment', icon: ClipboardList },
  { label: 'Schedule Contest',     path: '/institution/schedule-contest',    icon: Code2 },
  { label: 'Results & Leaderboard',path: '/institution/results',             icon: Trophy },
  { label: 'Institution Settings', path: '/institution/settings',            icon: Settings },
];
import { useApp } from '../../context/AppContext';

export const Sidebar: React.FC = () => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const location = useLocation();
  const { user } = useApp();

  const isAdmin = user.role === 'INSTITUTION_ADMIN' || user.role === 'PLATFORM_ADMIN';
  const navItems = isAdmin ? ADMIN_NAV : STUDENT_NAV;
  const subtitleText = isAdmin ? 'Institution Admin' : 'AI Growth Engine';
  const homeLink = isAdmin ? '/institution/overview' : '/dashboard';



  return (
    <motion.aside
      animate={{ width: isCollapsed ? 80 : 260 }}
      transition={{ duration: 0.3, ease: 'easeInOut' }}
      className="relative flex flex-col h-screen border-r border-white/10 bg-[#0c0e17]/90 backdrop-blur-xl z-30 shrink-0 select-none"
    >
      {/* Top Header / Logo */}
      <div className="flex items-center justify-between h-16 px-4 border-b border-white/10">
        <NavLink to={homeLink} className="flex items-center gap-3 overflow-hidden">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-pink-500 flex items-center justify-center shadow-lg shadow-indigo-500/30 shrink-0">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <AnimatePresence>
            {!isCollapsed && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="flex flex-col"
              >
                <span className="font-extrabold text-base tracking-tight text-white flex items-center gap-1.5">
                  Growth<span className="text-gradient">OS</span>
                </span>
                <span className="text-[10px] font-semibold text-slate-400 tracking-wider uppercase">
                  {subtitleText}
                </span>
              </motion.div>
            )}
          </AnimatePresence>
        </NavLink>

        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors"
          title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
        >
          {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Navigation Links */}
      <div className="flex-1 py-4 px-2 overflow-y-auto space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;

          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `group relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? 'text-white bg-gradient-to-r from-indigo-600/20 via-purple-600/15 to-transparent border border-indigo-500/30 shadow-md shadow-indigo-500/10'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                }`
              }
            >
              <Icon
                className={`w-5 h-5 shrink-0 transition-transform duration-200 group-hover:scale-110 ${
                  isActive ? 'text-indigo-400' : 'text-slate-400 group-hover:text-slate-200'
                }`}
              />

              {!isCollapsed && <span className="truncate flex-1">{item.label}</span>}
              {!isCollapsed && item.badge && (
                <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  {item.badge}
                </span>
              )}

              {/* Active Bar */}
              {isActive && (
                <motion.div
                  layoutId="activeSideBarNav"
                  className="absolute left-0 top-1.5 bottom-1.5 w-1 bg-gradient-to-b from-indigo-500 to-purple-500 rounded-r-full"
                />
              )}
            </NavLink>
          );
        })}
      </div>

      {/* User Profile Bottom Left Button (Opens Profile & Settings) */}
      <div className="p-3 border-t border-white/10">
        <NavLink
          to="/profile"
          className={({ isActive }) =>
            `flex items-center gap-3 p-2 rounded-xl transition-all ${
              isActive
                ? 'bg-purple-600/20 border border-purple-500/30 text-white shadow-md'
                : 'hover:bg-white/5 text-slate-300'
            } group`
          }
          title="Open Profile & Settings"
        >
          <img
            src={user.avatar}
            alt={user.name}
            className="w-9 h-9 rounded-xl object-cover border border-purple-500/40 shrink-0"
          />
          {!isCollapsed && (
            <div className="flex flex-col min-w-0 flex-1">
              <span className="text-xs font-bold text-white truncate group-hover:text-indigo-300 transition-colors">
                {user.name}
              </span>
              <span className="text-[10px] text-slate-400 truncate">
                {isAdmin ? (user.role || '').replace(/_/g, ' ') : `Lvl ${user.level} • Profile & Settings`}
              </span>
            </div>
          )}
        </NavLink>
      </div>
    </motion.aside>
  );
};
