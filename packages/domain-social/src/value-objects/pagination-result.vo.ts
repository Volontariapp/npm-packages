export class PaginationResultVO {
  constructor(
    public readonly page: number,
    public readonly limit: number,
    public readonly total: number,
    public readonly totalPages: number,
  ) {}
}
