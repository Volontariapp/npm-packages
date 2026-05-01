export abstract class BaseEntity {
  id!: string;
  createdAt!: Date;
  updatedAt?: Date;
}
