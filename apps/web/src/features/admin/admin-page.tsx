import type {
  Membership,
  User,
  WorkspaceDetail,
  WorkspaceSummary,
} from '@finance/shared-types';
import {
  Button,
  Card,
  EmptyState,
  Input,
  SectionHeader,
  Select,
  SyncBadge,
} from '@finance/ui';
import {
  startTransition,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { replaceWorkspaces } from '../../storage/db';
import { useAuth } from '../auth/auth-context';
import { useWorkspace } from '../workspaces/workspace-context';

const workspaceTypeOptions = [
  { label: 'Dom', value: 'personal' },
  { label: 'JDG', value: 'business' },
  { label: 'Firma', value: 'company' },
  { label: 'Wspólny', value: 'shared' },
] as const;

const membershipRoleOptions = [
  { label: 'Owner', value: 'owner' },
  { label: 'Editor', value: 'editor' },
  { label: 'Viewer', value: 'viewer' },
] as const;

const yesNoOptions = [
  { label: 'Tak', value: 'true' },
  { label: 'Nie', value: 'false' },
] as const;

const activeOptions = [
  { label: 'Aktywny', value: 'true' },
  { label: 'Wyłączony', value: 'false' },
] as const;

const archivedOptions = [
  { label: 'Aktywny', value: 'false' },
  { label: 'Zarchiwizowany', value: 'true' },
] as const;
const EMPTY_MEMBERS: Membership[] = [];

function getErrorMessage(reason: unknown, fallback: string) {
  return reason instanceof Error ? reason.message : fallback;
}

function resolveWorkspaceSelection(
  workspaces: WorkspaceSummary[],
  preferredWorkspaceId?: string | null,
) {
  if (
    preferredWorkspaceId &&
    workspaces.some((workspace) => workspace.id === preferredWorkspaceId)
  ) {
    return preferredWorkspaceId;
  }

  return workspaces[0]?.id ?? null;
}

export function AdminPage() {
  const { request, user: currentUser, logout } = useAuth();
  const {
    activeWorkspace,
    activeWorkspaceId,
    setActiveWorkspaceId,
    workspaces,
  } = useWorkspace();

  const [users, setUsers] = useState<User[]>([]);
  const [members, setMembers] = useState<Membership[]>([]);
  const [workspaceDetail, setWorkspaceDetail] =
    useState<WorkspaceDetail | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserDisplayName, setNewUserDisplayName] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserSystemAdmin, setNewUserSystemAdmin] = useState('false');
  const [newUserWorkspaceName, setNewUserWorkspaceName] = useState('');
  const [newUserWorkspaceType, setNewUserWorkspaceType] =
    useState<WorkspaceSummary['type']>('personal');
  const [newUserWorkspaceCurrency, setNewUserWorkspaceCurrency] =
    useState('PLN');

  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editingUserEmail, setEditingUserEmail] = useState('');
  const [editingUserDisplayName, setEditingUserDisplayName] = useState('');
  const [editingUserPassword, setEditingUserPassword] = useState('');
  const [editingUserActive, setEditingUserActive] = useState('true');
  const [editingUserSystemAdmin, setEditingUserSystemAdmin] = useState('false');

  const [newWorkspaceName, setNewWorkspaceName] = useState('');
  const [newWorkspaceType, setNewWorkspaceType] =
    useState<WorkspaceSummary['type']>('personal');
  const [newWorkspaceCurrency, setNewWorkspaceCurrency] = useState('PLN');

  const [workspaceName, setWorkspaceName] = useState('');
  const [workspaceType, setWorkspaceType] =
    useState<WorkspaceSummary['type']>('personal');
  const [workspaceCurrency, setWorkspaceCurrency] = useState('PLN');
  const [workspaceArchived, setWorkspaceArchived] = useState('false');

  const [memberUserId, setMemberUserId] = useState('');
  const [memberRole, setMemberRole] = useState<Membership['role']>('viewer');

  const currentWorkspaceDetail =
    activeWorkspaceId && workspaceDetail?.id === activeWorkspaceId
      ? workspaceDetail
      : null;
  const currentMembers = currentWorkspaceDetail ? members : EMPTY_MEMBERS;
  const canManageWorkspace = activeWorkspace?.role === 'owner';
  const activeUsersCount = users.filter((entry) => entry.isActive).length;
  const systemAdminsCount = users.filter(
    (entry) => entry.isSystemAdmin && entry.isActive,
  ).length;

  const existingMemberIds = useMemo(
    () => new Set(currentMembers.map((member) => member.userId)),
    [currentMembers],
  );
  const availableUsers = useMemo(
    () =>
      users.filter(
        (entry) => entry.isActive && !existingMemberIds.has(entry.id),
      ),
    [existingMemberIds, users],
  );
  const resolvedMemberUserId =
    memberUserId && availableUsers.some((entry) => entry.id === memberUserId)
      ? memberUserId
      : (availableUsers[0]?.id ?? '');

  const clearMessages = useCallback(() => {
    setError(null);
    setFeedback(null);
  }, []);

  const loadUsers = useCallback(async () => {
    const nextUsers = await request<User[]>('users');
    startTransition(() => {
      setUsers(nextUsers);
    });
    return nextUsers;
  }, [request]);

  const loadWorkspaces = useCallback(
    async (preferredWorkspaceId?: string | null) => {
      const nextWorkspaces = await request<WorkspaceSummary[]>('workspaces');
      await replaceWorkspaces(nextWorkspaces);

      const nextActiveWorkspaceId = resolveWorkspaceSelection(
        nextWorkspaces,
        preferredWorkspaceId ?? activeWorkspaceId,
      );

      if (nextActiveWorkspaceId) {
        setActiveWorkspaceId(nextActiveWorkspaceId);
      }

      return {
        nextActiveWorkspaceId,
        nextWorkspaces,
      };
    },
    [activeWorkspaceId, request, setActiveWorkspaceId],
  );

  const loadWorkspaceAdmin = useCallback(
    async (workspaceId: string) => {
      const [detail, nextMembers] = await Promise.all([
        request<WorkspaceDetail>(`workspaces/${workspaceId}`),
        request<Membership[]>(`workspaces/${workspaceId}/members`),
      ]);

      startTransition(() => {
        setWorkspaceDetail(detail);
        setMembers(nextMembers);
        setWorkspaceName(detail.name);
        setWorkspaceType(detail.type);
        setWorkspaceCurrency(detail.baseCurrency);
        setWorkspaceArchived(detail.archivedAt ? 'true' : 'false');
      });

      return {
        detail,
        nextMembers,
      };
    },
    [request],
  );

  useEffect(() => {
    if (!currentUser?.isSystemAdmin) {
      return;
    }

    void loadUsers().catch((reason) => {
      setError(getErrorMessage(reason, 'Nie udało się pobrać użytkowników'));
    });
  }, [currentUser?.isSystemAdmin, loadUsers]);

  useEffect(() => {
    if (!currentUser?.isSystemAdmin || !activeWorkspaceId) {
      return;
    }

    void loadWorkspaceAdmin(activeWorkspaceId).catch((reason) => {
      setError(
        getErrorMessage(
          reason,
          'Nie udało się pobrać danych administracyjnych',
        ),
      );
    });
  }, [activeWorkspaceId, currentUser?.isSystemAdmin, loadWorkspaceAdmin]);

  function beginEditUser(nextUser: User) {
    setEditingUserId(nextUser.id);
    setEditingUserEmail(nextUser.email);
    setEditingUserDisplayName(nextUser.displayName);
    setEditingUserPassword('');
    setEditingUserActive(nextUser.isActive ? 'true' : 'false');
    setEditingUserSystemAdmin(nextUser.isSystemAdmin ? 'true' : 'false');
  }

  function resetUserEditor() {
    setEditingUserId(null);
    setEditingUserEmail('');
    setEditingUserDisplayName('');
    setEditingUserPassword('');
    setEditingUserActive('true');
    setEditingUserSystemAdmin('false');
  }

  if (!currentUser?.isSystemAdmin) {
    return (
      <EmptyState
        title="Panel administracyjny jest ukryty"
        description="Ta sekcja jest dostępna wyłącznie dla system admina. Zaloguj się kontem demo albo nadaj sobie uprawnienie administratora z innej sesji."
      />
    );
  }

  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow="Admin"
        title="Panel administracyjny"
        description="Użytkownicy, role systemowe, workspace’y i operacyjne rozdzielenie dashboardów dla domu, JDG i firmy."
        action={
          feedback ? (
            <SyncBadge label={feedback} tone="success" />
          ) : error ? (
            <SyncBadge label={error} tone="danger" />
          ) : null
        }
      />

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="space-y-2">
          <p className="text-xs uppercase tracking-[0.25em] text-stone-500">
            Użytkownicy
          </p>
          <p className="font-display text-4xl font-bold text-white">
            {users.length}
          </p>
          <p className="text-sm text-stone-400">
            {activeUsersCount} aktywnych kont w instalacji
          </p>
        </Card>

        <Card className="space-y-2">
          <p className="text-xs uppercase tracking-[0.25em] text-stone-500">
            System admin
          </p>
          <p className="font-display text-4xl font-bold text-white">
            {systemAdminsCount}
          </p>
          <p className="text-sm text-stone-400">
            Minimum jeden aktywny admin musi pozostać
          </p>
        </Card>

        <Card className="space-y-2">
          <p className="text-xs uppercase tracking-[0.25em] text-stone-500">
            Twoje workspace’y
          </p>
          <p className="font-display text-4xl font-bold text-white">
            {workspaces.length}
          </p>
          <p className="text-sm text-stone-400">
            Każdy workspace ma własny dashboard i role
          </p>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <Card className="space-y-5">
          <SectionHeader
            eyebrow="Users"
            title="Użytkownicy systemu"
            description="Twórz własne konta, nadaj system admina, startowy workspace i zarządzaj aktywnością."
          />

          <form
            className="grid gap-4 md:grid-cols-2"
            onSubmit={(event) => {
              event.preventDefault();
              clearMessages();
              void request<User>('users', {
                method: 'POST',
                body: JSON.stringify({
                  email: newUserEmail,
                  displayName: newUserDisplayName,
                  password: newUserPassword,
                  isSystemAdmin: newUserSystemAdmin === 'true',
                  workspace: newUserWorkspaceName
                    ? {
                        name: newUserWorkspaceName,
                        type: newUserWorkspaceType,
                        baseCurrency: newUserWorkspaceCurrency,
                      }
                    : undefined,
                }),
              })
                .then(async () => {
                  setNewUserEmail('');
                  setNewUserDisplayName('');
                  setNewUserPassword('');
                  setNewUserSystemAdmin('false');
                  setNewUserWorkspaceName('');
                  setNewUserWorkspaceType('personal');
                  setNewUserWorkspaceCurrency('PLN');
                  await loadUsers();
                  setFeedback('Użytkownik został dodany');
                })
                .catch((reason) => {
                  setError(
                    getErrorMessage(reason, 'Nie udało się dodać użytkownika'),
                  );
                });
            }}
          >
            <Input
              label="Email"
              name="newUserEmail"
              value={newUserEmail}
              onChange={setNewUserEmail}
              placeholder="owner@firma.pl"
            />
            <Input
              label="Nazwa"
              name="newUserDisplayName"
              value={newUserDisplayName}
              onChange={setNewUserDisplayName}
              placeholder="Jan Kowalski"
            />
            <Input
              label="Hasło"
              name="newUserPassword"
              type="password"
              value={newUserPassword}
              onChange={setNewUserPassword}
              placeholder="Minimum 8 znaków"
            />
            <Select
              label="System admin"
              name="newUserSystemAdmin"
              value={newUserSystemAdmin}
              onChange={setNewUserSystemAdmin}
              options={yesNoOptions.map((option) => ({ ...option }))}
            />
            <Input
              label="Pierwszy workspace"
              name="newUserWorkspaceName"
              value={newUserWorkspaceName}
              onChange={setNewUserWorkspaceName}
              placeholder="Opcjonalnie, np. Dom"
            />
            <Select
              label="Typ workspace"
              name="newUserWorkspaceType"
              value={newUserWorkspaceType}
              onChange={(value: string) =>
                setNewUserWorkspaceType(value as WorkspaceSummary['type'])
              }
              options={workspaceTypeOptions.map((option) => ({ ...option }))}
            />
            <Input
              label="Waluta workspace"
              name="newUserWorkspaceCurrency"
              value={newUserWorkspaceCurrency}
              onChange={setNewUserWorkspaceCurrency}
              placeholder="PLN"
            />
            <div className="flex items-end">
              <Button
                type="submit"
                className="w-full"
                disabled={
                  !newUserEmail || !newUserDisplayName || !newUserPassword
                }
              >
                Dodaj użytkownika
              </Button>
            </div>
          </form>

          <div className="grid gap-3">
            {users.map((entry) => (
              <div
                key={entry.id}
                className="rounded-[24px] border border-white/10 bg-white/5 p-4"
              >
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="font-semibold text-white">
                      {entry.displayName}
                    </p>
                    <p className="text-sm text-stone-400">{entry.email}</p>
                    <p className="mt-1 text-xs text-stone-500">
                      Ostatnie logowanie: {entry.lastLoginAt ?? 'brak'}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <SyncBadge
                      label={entry.isActive ? 'Aktywny' : 'Wyłączony'}
                      tone={entry.isActive ? 'success' : 'warning'}
                    />
                    <SyncBadge
                      label={
                        entry.isSystemAdmin ? 'System admin' : 'Standard user'
                      }
                      tone={entry.isSystemAdmin ? 'success' : 'neutral'}
                    />
                    <Button
                      variant="secondary"
                      onClick={() => beginEditUser(entry)}
                    >
                      Edytuj
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() => {
                        if (
                          !window.confirm(
                            `Usunąć użytkownika ${entry.displayName}? To skasuje też jego workspaces.`,
                          )
                        ) {
                          return;
                        }

                        clearMessages();
                        void request<{ success: true }>(`users/${entry.id}`, {
                          method: 'DELETE',
                        })
                          .then(async () => {
                            if (entry.id === currentUser.id) {
                              await logout();
                              return;
                            }

                            await loadUsers();
                            const { nextActiveWorkspaceId } =
                              await loadWorkspaces();

                            if (nextActiveWorkspaceId) {
                              await loadWorkspaceAdmin(nextActiveWorkspaceId);
                            }

                            if (editingUserId === entry.id) {
                              resetUserEditor();
                            }

                            setFeedback('Użytkownik został usunięty');
                          })
                          .catch((reason) => {
                            setError(
                              getErrorMessage(
                                reason,
                                'Nie udało się usunąć użytkownika',
                              ),
                            );
                          });
                      }}
                    >
                      Usuń
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="space-y-5">
          <SectionHeader
            eyebrow="Editor"
            title="Edycja użytkownika"
            description="Zmieniaj email, hasło, aktywność i status system admina."
          />

          {editingUserId ? (
            <form
              className="space-y-4"
              onSubmit={(event) => {
                event.preventDefault();
                clearMessages();
                void request<User>(`users/${editingUserId}`, {
                  method: 'PATCH',
                  body: JSON.stringify({
                    email: editingUserEmail,
                    displayName: editingUserDisplayName,
                    password: editingUserPassword || undefined,
                    isActive: editingUserActive === 'true',
                    isSystemAdmin: editingUserSystemAdmin === 'true',
                  }),
                })
                  .then(async () => {
                    const editedSelf = editingUserId === currentUser.id;
                    const keepsAccess =
                      editingUserActive === 'true' &&
                      editingUserSystemAdmin === 'true';

                    if (editedSelf && !keepsAccess) {
                      await logout();
                      return;
                    }

                    await loadUsers();
                    setFeedback('Użytkownik został zaktualizowany');
                    resetUserEditor();
                  })
                  .catch((reason) => {
                    setError(
                      getErrorMessage(
                        reason,
                        'Nie udało się zaktualizować użytkownika',
                      ),
                    );
                  });
              }}
            >
              <Input
                label="Email"
                name="editingUserEmail"
                value={editingUserEmail}
                onChange={setEditingUserEmail}
              />
              <Input
                label="Nazwa"
                name="editingUserDisplayName"
                value={editingUserDisplayName}
                onChange={setEditingUserDisplayName}
              />
              <Input
                label="Nowe hasło"
                name="editingUserPassword"
                type="password"
                value={editingUserPassword}
                onChange={setEditingUserPassword}
                placeholder="Zostaw puste bez zmiany"
              />
              <Select
                label="Status"
                name="editingUserActive"
                value={editingUserActive}
                onChange={setEditingUserActive}
                options={activeOptions.map((option) => ({ ...option }))}
              />
              <Select
                label="System admin"
                name="editingUserSystemAdmin"
                value={editingUserSystemAdmin}
                onChange={setEditingUserSystemAdmin}
                options={yesNoOptions.map((option) => ({ ...option }))}
              />
              <div className="flex gap-3">
                <Button type="submit">Zapisz zmiany</Button>
                <Button variant="ghost" onClick={resetUserEditor}>
                  Wyczyść
                </Button>
              </div>
            </form>
          ) : (
            <EmptyState
              title="Brak wybranego użytkownika"
              description="Kliknij Edytuj przy użytkowniku, aby zmienić jego dostęp i dane logowania."
            />
          )}
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <Card className="space-y-5">
          <SectionHeader
            eyebrow="Workspaces"
            title="Nowy workspace"
            description="Twórz oddzielne pulpity dla domu, JDG, firmy i pracy współdzielonej."
          />

          <form
            className="grid gap-4 md:grid-cols-2"
            onSubmit={(event) => {
              event.preventDefault();
              clearMessages();
              void request<WorkspaceDetail>('workspaces', {
                method: 'POST',
                body: JSON.stringify({
                  name: newWorkspaceName,
                  type: newWorkspaceType,
                  baseCurrency: newWorkspaceCurrency,
                }),
              })
                .then(async (createdWorkspace) => {
                  setNewWorkspaceName('');
                  setNewWorkspaceType('personal');
                  setNewWorkspaceCurrency('PLN');

                  const { nextActiveWorkspaceId } = await loadWorkspaces(
                    createdWorkspace.id,
                  );

                  if (nextActiveWorkspaceId) {
                    await loadWorkspaceAdmin(nextActiveWorkspaceId);
                  }

                  setFeedback('Workspace został utworzony');
                })
                .catch((reason) => {
                  setError(
                    getErrorMessage(
                      reason,
                      'Nie udało się utworzyć workspace’u',
                    ),
                  );
                });
            }}
          >
            <Input
              label="Nazwa"
              name="newWorkspaceName"
              value={newWorkspaceName}
              onChange={setNewWorkspaceName}
              placeholder="Dom, JDG, Firma"
            />
            <Select
              label="Typ"
              name="newWorkspaceType"
              value={newWorkspaceType}
              onChange={(value: string) =>
                setNewWorkspaceType(value as WorkspaceSummary['type'])
              }
              options={workspaceTypeOptions.map((option) => ({ ...option }))}
            />
            <Input
              label="Waluta bazowa"
              name="newWorkspaceCurrency"
              value={newWorkspaceCurrency}
              onChange={setNewWorkspaceCurrency}
              placeholder="PLN"
            />
            <div className="flex items-end">
              <Button
                type="submit"
                className="w-full"
                disabled={!newWorkspaceName}
              >
                Utwórz workspace
              </Button>
            </div>
          </form>
        </Card>

        <Card className="space-y-5">
          <SectionHeader
            eyebrow="Active workspace"
            title={
              currentWorkspaceDetail
                ? `Konfiguracja: ${currentWorkspaceDetail.name}`
                : 'Konfiguracja workspace’u'
            }
            description="Edytuj nazwę, typ, walutę i stan archiwizacji bieżącego kontekstu."
            action={
              canManageWorkspace ? (
                <SyncBadge label="Owner access" tone="success" />
              ) : (
                <SyncBadge label="Tylko owner może zmieniać" tone="warning" />
              )
            }
          />

          {currentWorkspaceDetail ? (
            <form
              className="grid gap-4 md:grid-cols-2"
              onSubmit={(event) => {
                event.preventDefault();
                if (!activeWorkspaceId) {
                  return;
                }

                clearMessages();
                void request<WorkspaceDetail>(
                  `workspaces/${activeWorkspaceId}`,
                  {
                    method: 'PATCH',
                    body: JSON.stringify({
                      name: workspaceName,
                      type: workspaceType,
                      baseCurrency: workspaceCurrency,
                      archivedAt:
                        workspaceArchived === 'true'
                          ? new Date().toISOString()
                          : null,
                    }),
                  },
                )
                  .then(async () => {
                    await loadWorkspaces(activeWorkspaceId);
                    await loadWorkspaceAdmin(activeWorkspaceId);
                    setFeedback('Workspace został zaktualizowany');
                  })
                  .catch((reason) => {
                    setError(
                      getErrorMessage(
                        reason,
                        'Nie udało się zaktualizować workspace’u',
                      ),
                    );
                  });
              }}
            >
              <Input
                label="Nazwa"
                name="workspaceName"
                value={workspaceName}
                onChange={setWorkspaceName}
              />
              <Select
                label="Typ"
                name="workspaceType"
                value={workspaceType}
                onChange={(value: string) =>
                  setWorkspaceType(value as WorkspaceSummary['type'])
                }
                options={workspaceTypeOptions.map((option) => ({ ...option }))}
              />
              <Input
                label="Waluta bazowa"
                name="workspaceCurrency"
                value={workspaceCurrency}
                onChange={setWorkspaceCurrency}
              />
              <Select
                label="Archiwizacja"
                name="workspaceArchived"
                value={workspaceArchived}
                onChange={setWorkspaceArchived}
                options={archivedOptions.map((option) => ({ ...option }))}
              />
              <div className="md:col-span-2">
                <Button type="submit" disabled={!canManageWorkspace}>
                  Zapisz workspace
                </Button>
              </div>
            </form>
          ) : (
            <EmptyState
              title="Brak aktywnego workspace’u"
              description="Utwórz nowy workspace lub wybierz istniejący z przełącznika po lewej."
            />
          )}
        </Card>
      </div>

      <Card className="space-y-5">
        <SectionHeader
          eyebrow="Members"
          title="Członkowie aktywnego workspace’u"
          description="Dodawaj ludzi do domu, JDG i firmowych kontekstów, zmieniaj role oraz usuwaj dostęp."
        />

        {currentWorkspaceDetail ? (
          <>
            <form
              className="grid gap-4 md:grid-cols-[1.4fr_0.8fr_0.6fr]"
              onSubmit={(event) => {
                event.preventDefault();
                if (!activeWorkspaceId || !resolvedMemberUserId) {
                  return;
                }

                clearMessages();
                void request<Membership>(
                  `workspaces/${activeWorkspaceId}/members`,
                  {
                    method: 'POST',
                    body: JSON.stringify({
                      userId: resolvedMemberUserId,
                      role: memberRole,
                    }),
                  },
                )
                  .then(async () => {
                    setMemberUserId('');
                    await loadWorkspaceAdmin(activeWorkspaceId);
                    setFeedback('Członek został dodany do workspace’u');
                  })
                  .catch((reason) => {
                    setError(
                      getErrorMessage(reason, 'Nie udało się dodać członka'),
                    );
                  });
              }}
            >
              <Select
                label="Użytkownik"
                name="memberUserId"
                value={resolvedMemberUserId}
                disabled={!canManageWorkspace || availableUsers.length === 0}
                onChange={setMemberUserId}
                options={
                  availableUsers.length > 0
                    ? availableUsers.map((entry) => ({
                        label: `${entry.displayName} · ${entry.email}`,
                        value: entry.id,
                      }))
                    : [{ label: 'Brak dostępnych użytkowników', value: '' }]
                }
              />
              <Select
                label="Rola"
                name="memberRole"
                value={memberRole}
                disabled={!canManageWorkspace}
                onChange={(value: string) =>
                  setMemberRole(value as Membership['role'])
                }
                options={membershipRoleOptions.map((option) => ({ ...option }))}
              />
              <div className="flex items-end">
                <Button
                  type="submit"
                  className="w-full"
                  disabled={!canManageWorkspace || !resolvedMemberUserId}
                >
                  Dodaj
                </Button>
              </div>
            </form>

            <div className="grid gap-3">
              {currentMembers.map((member) => (
                <div
                  key={member.id}
                  className="rounded-[24px] border border-white/10 bg-white/5 p-4"
                >
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <p className="font-semibold text-white">
                        {member.user?.displayName ?? member.userId}
                      </p>
                      <p className="text-sm text-stone-400">
                        {member.user?.email ?? 'Brak emaila'}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <Select
                        label="Rola"
                        name={`member-role-${member.id}`}
                        value={member.role}
                        disabled={
                          !canManageWorkspace ||
                          member.userId === currentWorkspaceDetail.ownerId
                        }
                        onChange={(value: string) => {
                          if (!activeWorkspaceId) {
                            return;
                          }

                          clearMessages();
                          void request<Membership>(
                            `workspaces/${activeWorkspaceId}/members/${member.id}`,
                            {
                              method: 'PATCH',
                              body: JSON.stringify({
                                role: value,
                              }),
                            },
                          )
                            .then(async () => {
                              await loadWorkspaceAdmin(activeWorkspaceId);
                              setFeedback('Rola została zmieniona');
                            })
                            .catch((reason) => {
                              setError(
                                getErrorMessage(
                                  reason,
                                  'Nie udało się zmienić roli',
                                ),
                              );
                            });
                        }}
                        options={membershipRoleOptions.map((option) => ({
                          ...option,
                        }))}
                      />
                      <Button
                        variant="ghost"
                        disabled={
                          !canManageWorkspace ||
                          member.userId === currentWorkspaceDetail.ownerId
                        }
                        onClick={() => {
                          if (!activeWorkspaceId) {
                            return;
                          }

                          if (
                            !window.confirm(
                              `Usunąć ${member.user?.displayName ?? member.userId} z tego workspace’u?`,
                            )
                          ) {
                            return;
                          }

                          clearMessages();
                          void request<{ success: true }>(
                            `workspaces/${activeWorkspaceId}/members/${member.id}`,
                            {
                              method: 'DELETE',
                            },
                          )
                            .then(async () => {
                              await loadWorkspaceAdmin(activeWorkspaceId);
                              setFeedback('Dostęp użytkownika został usunięty');
                            })
                            .catch((reason) => {
                              setError(
                                getErrorMessage(
                                  reason,
                                  'Nie udało się usunąć członka',
                                ),
                              );
                            });
                        }}
                      >
                        Usuń dostęp
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <EmptyState
            title="Brak danych o członkach"
            description="Wybierz workspace, aby zarządzać rolami i dostępami."
          />
        )}
      </Card>
    </div>
  );
}
