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
  readonly name?: string;
  readonly slug?: string;
  readonly description?: string;
  readonly iconPath?: string;

  constructor(
    data: { name?: string; slug?: string; description?: string; iconPath?: string } = {},
  ) {
    this.name = data.name;
    this.slug = data.slug;
    this.description = data.description;
    this.iconPath = data.iconPath;
  }
}
