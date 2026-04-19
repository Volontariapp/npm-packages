export class PaginationVO {
  constructor(
    public readonly page: number,
    public readonly limit: number,
  ) {}
}
