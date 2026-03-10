import { hasRequiredRole } from './role.utils';

describe('hasRequiredRole', () => {
  it('allows owner to perform editor actions', () => {
    expect(hasRequiredRole('owner', 'editor')).toBe(true);
  });

  it('blocks viewer from editor actions', () => {
    expect(hasRequiredRole('viewer', 'editor')).toBe(false);
  });
});
