import { IsDefined, IsNotEmpty } from 'class-validator';

export class MSURLsConfig {
  @IsDefined()
  @IsNotEmpty()
  msPostUrl!: string;

  @IsDefined()
  @IsNotEmpty()
  msUserUrl!: string;

  @IsDefined()
  @IsNotEmpty()
  msEventUrl!: string;
}
