/**
 * Public request to add a requirement to an event.
 */
export interface AddRequirementRequest {
  name: string;
  description: string;
  neededQuantity: number;
}

/**
 * Public request to remove a requirement from an event.
 */
export interface RemoveRequirementRequest {
  requirementId: string;
}
