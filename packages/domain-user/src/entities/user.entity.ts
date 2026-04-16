import { Badge } from "./badge.entity.js";

export class User {
  constructor(
    public readonly id: string,
    public email: string,
    public pseudo: string,
    public role: string,
    public bio?: string,
    public logoPath?: string,
    public totalImpactScore: number = 0,
    public badges: Badge[] = [],
  ) {}
}
