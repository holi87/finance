export interface RequestUser {
  id: string;
  email: string;
  isSystemAdmin: boolean;
  sessionId?: string;
}
