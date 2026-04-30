import {
  MessageSquare,
  Briefcase,
  GitBranch,
  Server,
  Database,
  AlertTriangle,
  FileText,
  Settings,
} from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { motion, type Variants } from 'framer-motion';
import clsx from 'clsx';

interface SidebarProps {
  collapsed?: boolean;
  isDatabricksConnected: boolean;
}

interface NavItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  path: string;
  section?: string;
}

const navItems: NavItem[] = [
  { id: 'chat', label: 'Chat', icon: MessageSquare, path: '/' },
  { id: 'jobs', label: 'Jobs', icon: Briefcase, path: '/jobs' },
  { id: 'pipelines', label: 'DLT', icon: GitBranch, path: '/pipelines' },
  { id: 'clusters', label: 'Clusters', icon: Server, path: '/clusters' },
  { id: 'dbt', label: 'dbt', icon: Database, path: '/dbt' },
  { id: 'alerts', label: 'Alerts', icon: AlertTriangle, path: '/alerts' },
];

const secondaryItems: NavItem[] = [
  { id: 'logs', label: 'Logs', icon: FileText, path: '/logs', section: 'SYSTEM' },
  { id: 'settings', label: 'Settings', icon: Settings, path: '/settings', section: 'SYSTEM' },
];

export default function Sidebar({
  collapsed = false,
  isDatabricksConnected,
}: SidebarProps) {
  const location = useLocation();
  const easeCurve: [number, number, number, number] = [0.42, 0, 0.58, 1];

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2
      }
    }
  };

  const itemVariants: Variants = {
    hidden: {
      opacity: 0,
      x: -20,
      scale: 0.95
    },
    visible: {
      opacity: 1,
      x: 0,
      scale: 1,
      transition: {
        type: "spring",
        stiffness: 300,
        damping: 24
      }
    }
  };

  const statusVariants: Variants = {
    connected: {
      backgroundColor: "rgb(126, 231, 135)",
      boxShadow: [
        "0 0 0 0 rgba(126,231,135,0.55)",
        "0 0 0 8px rgba(126,231,135,0)",
        "0 0 0 0 rgba(126,231,135,0.55)"
      ],
      transition: {
        duration: 2,
        repeat: Infinity,
        ease: easeCurve
      }
    },
    offline: {
      backgroundColor: "rgb(255, 107, 107)",
      boxShadow: [
        "0 0 0 0 rgba(255,107,107,0.55)",
        "0 0 0 8px rgba(255,107,107,0)",
        "0 0 0 0 rgba(255,107,107,0.55)"
      ],
      transition: {
        duration: 2,
        repeat: Infinity,
        ease: easeCurve
      }
    }
  };

  const NavLink = ({ item }: { item: NavItem }) => {
    const isActive = location.pathname === item.path;
    const Icon = item.icon;

    return (
      <motion.div
        variants={itemVariants}
        whileHover={{
          scale: 1.02,
          transition: { duration: 0.2 }
        }}
        whileTap={{ scale: 0.98 }}
      >
        <a
          href={item.path}
          aria-label={collapsed ? item.label : undefined}
          onClick={(event) => {
            if (window.location.pathname === item.path) {
              event.preventDefault();
              window.location.reload();
            }
          }}
        >
          <motion.div
            className={clsx(
              'flex items-center py-2.5 rounded-lg cursor-pointer transition-all',
              collapsed ? 'justify-center px-3' : 'gap-3 px-4',
              isActive
                ? 'bg-accent-cyan/10 border-l-2 border-accent-cyan text-accent-cyan shadow-lg shadow-accent-cyan/10'
                : clsx(
                    'text-text-secondary hover:text-text-primary hover:bg-white/[0.055]',
                    !collapsed && 'hover:translate-x-1'
                  )
            )}
            whileHover={{
              x: isActive || collapsed ? 0 : 4,
              backgroundColor: isActive ? undefined : "rgba(255,255,255,0.055)"
            }}
            transition={{ duration: 0.15 }}
          >
            <motion.div
              animate={{ rotate: isActive ? 360 : 0 }}
              transition={{ duration: 0.5, ease: "easeInOut" }}
            >
              <Icon className={clsx('w-5 h-5', isActive && 'text-accent-cyan')} />
            </motion.div>
            <motion.span
              aria-hidden={collapsed}
              className={clsx(
                'text-sm font-medium whitespace-nowrap transition-[opacity,max-width] duration-200 ease-in-out',
                collapsed
                  ? 'opacity-0 max-w-0 overflow-hidden'
                  : 'opacity-100 max-w-[12rem]'
              )}
              animate={{ opacity: collapsed ? 0 : 1 }}
              transition={{ duration: 0.2, delay: collapsed ? 0 : 0.1 }}
            >
              {item.label}
            </motion.span>
          </motion.div>
        </a>
      </motion.div>
    );
  };

  return (
    <motion.aside
      className={clsx(
        'app-shell border-r border-white/10 flex flex-col h-full overflow-hidden',
        collapsed ? 'w-16' : 'w-[260px]',
        'transition-[width] duration-200 ease-in-out'
      )}
      initial={{ x: -280 }}
      animate={{ x: 0 }}
      transition={{
        type: "spring",
        stiffness: 300,
        damping: 30,
        delay: 0.1
      }}
    >
      <motion.div
        className={clsx(
          'flex-1 py-6 space-y-1 overflow-y-auto scrollbar-thin',
          collapsed ? 'px-2' : 'px-4'
        )}
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <motion.div className="mb-6" variants={itemVariants}>
          {navItems.map((item) => (
            <NavLink key={item.id} item={item} />
          ))}
        </motion.div>

        <motion.div
          className="pt-6 border-t border-white/10"
          variants={itemVariants}
        >
          {!collapsed && (
            <motion.div
              className="px-4 mb-3"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
            >
              <span className="text-xs font-display text-text-muted tracking-wider">
                SYSTEM
              </span>
            </motion.div>
          )}
          {secondaryItems.map((item) => (
            <NavLink key={item.id} item={item} />
          ))}
        </motion.div>
      </motion.div>

      <motion.div
        className="p-4 border-t border-white/10"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8 }}
      >
        <motion.div
          className={clsx(
            'flex items-center px-3 py-2 app-tile rounded-lg border',
            collapsed ? 'justify-center' : 'gap-2'
          )}
          whileHover={{ scale: 1.02 }}
          transition={{ duration: 0.2 }}
        >
          <motion.div
            className={clsx('w-2 h-2 rounded-full')}
            variants={statusVariants}
            animate={isDatabricksConnected ? 'connected' : 'offline'}
            transition={{ duration: 0.3 }}
          />
          <motion.div
            className={clsx(
              'transition-[opacity,max-width] duration-200 ease-in-out',
              collapsed
                ? 'opacity-0 max-w-0 overflow-hidden'
                : 'opacity-100 max-w-[14rem]'
            )}
            animate={{ opacity: collapsed ? 0 : 1 }}
            transition={{ duration: 0.2, delay: collapsed ? 0 : 0.1 }}
          >
            <motion.div
              className="text-xs font-mono text-text-primary"
              key={isDatabricksConnected ? 'connected' : 'offline'}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              {isDatabricksConnected ? 'Databricks Connected' : 'Databricks Offline'}
            </motion.div>
            <div className="text-xs text-text-muted">/api/databricks/ping</div>
          </motion.div>
        </motion.div>
      </motion.div>
    </motion.aside>
  );
}
