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

  @IsDefined()
  @IsNotEmpty()
  msSocialUrl!: string;

  @IsDefined()
  @IsNotEmpty()
  msWsUrl!: string;
}
