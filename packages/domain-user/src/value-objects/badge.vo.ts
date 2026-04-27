export class BadgeId {
  constructor(public readonly value: string) {}
}

export class BadgeSlug {
  constructor(public readonly value: string) {}
}

export class CreateBadgeInput {
  constructor(
    public readonly name: string,
    public readonly slug: string,
    public readonly description: string,
    public readonly iconPath?: string,
  ) {}
}

export class UpdateBadgeInput {
  constructor(
    public readonly name?: string,
    public readonly slug?: string,
    public readonly description?: string,
    public readonly iconPath?: string,
  ) {}
}
