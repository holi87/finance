import type { WorkspaceSummary } from '@finance/shared-types';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from 'react';

import {
  readActiveWorkspaceId,
  writeActiveWorkspaceId,
} from '../../services/session-store';
import { db } from '../../storage/db';

interface WorkspaceContextValue {
  workspaces: WorkspaceSummary[];
  activeWorkspaceId: string | null;
  activeWorkspace: WorkspaceSummary | null;
  setActiveWorkspaceId: (workspaceId: string) => void;
}

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

export function WorkspaceProvider({ children }: PropsWithChildren) {
  const liveWorkspaces = useLiveQuery<WorkspaceSummary[]>(
    () => db.workspaces.toArray(),
    [],
  );
  const workspaces = useMemo(() => liveWorkspaces ?? [], [liveWorkspaces]);
  const [activeWorkspaceId, setActiveWorkspaceIdState] = useState<
    string | null
  >(readActiveWorkspaceId());

  useEffect(() => {
    if (workspaces.length === 0) {
      return;
    }
    if (
      !activeWorkspaceId ||
      !workspaces.some((workspace) => workspace.id === activeWorkspaceId)
    ) {
      const next = workspaces[0]?.id ?? null;
      if (next) {
        writeActiveWorkspaceId(next);
      }
      setActiveWorkspaceIdState(next);
    }
  }, [activeWorkspaceId, workspaces]);

  const activeWorkspace =
    workspaces.find((workspace) => workspace.id === activeWorkspaceId) ?? null;

  return (
    <WorkspaceContext.Provider
      value={{
        workspaces,
        activeWorkspaceId,
        activeWorkspace,
        setActiveWorkspaceId: (workspaceId) => {
          writeActiveWorkspaceId(workspaceId);
          setActiveWorkspaceIdState(workspaceId);
        },
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace() {
  const context = useContext(WorkspaceContext);
  if (!context) {
    throw new Error('useWorkspace must be used within WorkspaceProvider');
  }
  return context;
}
