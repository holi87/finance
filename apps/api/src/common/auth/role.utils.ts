import type { MembershipRole } from '@finance/shared-types';

const roleWeight: Record<MembershipRole, number> = {
  viewer: 0,
  editor: 1,
  owner: 2,
};

export function hasRequiredRole(
  role: MembershipRole,
  required: MembershipRole,
): boolean {
  return (roleWeight[role] ?? 0) >= (roleWeight[required] ?? 0);
}
