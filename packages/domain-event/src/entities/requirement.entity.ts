export class RequirementEntity {
  id!: string;
  name!: string;
  description!: string;
  quantity!: number;
  currentQuantity!: number;
  isSystem!: boolean;
  createdBy?: string;
}
