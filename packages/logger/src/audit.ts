/**
 * Sensitive actions that leave an audit trail. A closed list on purpose: every audited action is a
 * decision of the team, and a typo can not create a trail nobody searches for.
 */
export const AUDIT_ACTIONS = [
  'user.admin_deleted',
  'user.admin_updated',
  'badge.created',
  'badge.updated',
  'badge.deleted',
] as const;

export type AuditAction = (typeof AUDIT_ACTIONS)[number];

export type AuditResult = 'success' | 'failure' | 'denied';

export interface AuditTarget {
  /** Kind of the thing the action was applied to, for example `user` or `badge`. */
  type: string;
  /** Identifier of the target. An id, never an e-mail or a name. */
  id: string;
}

export interface AuditEntry {
  /** Identifier of who did it. An id, never an e-mail or a name. */
  actor: string;
  action: AuditAction;
  target: AuditTarget;
  result: AuditResult;
}
