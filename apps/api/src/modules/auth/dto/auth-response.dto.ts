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

export class AuthMembershipSummaryDto {
  @ApiProperty({ format: 'uuid' })
  schoolId!: string;

  @ApiProperty({ enum: ['admin', 'teacher'] })
  memberType!: 'admin' | 'teacher';
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

  @ApiProperty({
    enum: ['admin', 'teacher', 'super_admin'],
    description:
      'super_admin is a platform identity (no school membership). schoolId is null for that path.',
  })
  memberType!: 'admin' | 'teacher' | 'super_admin';

  @ApiPropertyOptional({
    format: 'uuid',
    nullable: true,
    type: String,
    description:
      'Selected school for admin/teacher. Null for super_admin. When multiple memberships exist, the first is chosen deterministically by (member_type admin-first, school_id ASC); full list is in memberships.',
  })
  schoolId!: string | null;

  @ApiPropertyOptional({
    type: [AuthMembershipSummaryDto],
    description: 'All active admin/teacher memberships (empty for super_admin).',
  })
  memberships?: AuthMembershipSummaryDto[];
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
