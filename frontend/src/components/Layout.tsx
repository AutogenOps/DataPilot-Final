import { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import TopNav from './TopNav';
import Sidebar from './Sidebar';
import { getApiBaseUrl } from '../lib/clientSettings';

type ApiHealthResponse = {
  ok: boolean;
  service?: string;
};

type DatabricksPingResponse = {
  ok: boolean;
  message?: string;
  errorType?: string;
  error?: string;
};

const SIDEBAR_COLLAPSED_STORAGE_KEY = 'datapilot.sidebarCollapsed';

function getInitialSidebarCollapsed(): boolean {
  if (typeof window === 'undefined') return false;

  const stored = window.localStorage.getItem(SIDEBAR_COLLAPSED_STORAGE_KEY);
  if (stored === 'true') return true;
  if (stored === 'false') return false;

  return window.matchMedia?.('(max-width: 768px)').matches ?? false;
}

export default function Layout() {
  // Do not display the Databricks workspace URL/host in the UI.
  const [workspace, setWorkspace] = useState<string>('Databricks Workspace');
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [isDatabricksConnected, setIsDatabricksConnected] = useState<boolean>(false);

  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(() =>
    getInitialSidebarCollapsed()
  );

  useEffect(() => {
    window.localStorage.setItem(
      SIDEBAR_COLLAPSED_STORAGE_KEY,
      String(isSidebarCollapsed)
    );
  }, [isSidebarCollapsed]);

  useEffect(() => {
    const controller = new AbortController();
    const apiBaseUrl = getApiBaseUrl();

    const load = async () => {
      try {
        const res = await fetch(`${apiBaseUrl}/api/health`, {
          method: 'GET',
          signal: controller.signal,
        });

        const data = (await res.json()) as ApiHealthResponse;
        setIsConnected(!!(res.ok && data.ok));
        setWorkspace('Databricks Workspace');
      } catch {
        setIsConnected(false);
        setWorkspace('Databricks Workspace');
      }

      try {
        const res = await fetch(`${apiBaseUrl}/api/databricks/ping`, {
          method: 'GET',
          signal: controller.signal,
        });

        const data = (await res.json()) as DatabricksPingResponse;
        setIsDatabricksConnected(!!(res.ok && data.ok));
      } catch {
        setIsDatabricksConnected(false);
      }
    };

    load();
    return () => controller.abort();
  }, []);

  return (
    <div className="h-screen flex flex-col overflow-hidden text-text-primary">
      <TopNav
        workspace={workspace}
        isConnected={isConnected}
        isSidebarCollapsed={isSidebarCollapsed}
        onToggleSidebar={() => setIsSidebarCollapsed((v) => !v)}
      />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar
          collapsed={isSidebarCollapsed}
          isDatabricksConnected={isDatabricksConnected}
        />
        <main className="flex-1 overflow-auto scrollbar-thin bg-transparent">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
