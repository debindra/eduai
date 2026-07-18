import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AuthIdentityDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiPropertyOptional({ nullable: true, type: String })
  email!: string | null;

  @ApiPropertyOptional({ nullable: true, type: String })
  phone!: string | null;

  @ApiPropertyOptional({ nullable: true, type: String })
  displayName!: string | null;
}

export class AuthSessionResponseDto {
  @ApiProperty()
  accessToken!: string;

  @ApiProperty()
  refreshToken!: string;

  @ApiProperty()
  expiresIn!: number;

  @ApiProperty({ type: AuthIdentityDto })
  identity!: AuthIdentityDto;

  @ApiProperty({ enum: ['admin', 'teacher'] })
  memberType!: 'admin' | 'teacher';

  @ApiProperty({ format: 'uuid' })
  schoolId!: string;
}

export class InviteResponseDto {
  @ApiProperty({ format: 'uuid' })
  identityId!: string;

  @ApiProperty({ enum: ['email', 'mobile'] })
  delivery!: 'email' | 'mobile';
}

export class MessageResponseDto {
  @ApiProperty()
  message!: string;
}
