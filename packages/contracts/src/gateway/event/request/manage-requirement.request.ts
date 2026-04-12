/**
 * Public request to manage event requirements.
 */
export interface ManageRequirementRequest {
  type: 'ADD' | 'REMOVE';
  name?: string;
  description?: string;
  neededQuantity?: number;
  requirementId?: string;
}
