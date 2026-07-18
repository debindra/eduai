import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class RequestRecoveryOtpDto {
  @ApiProperty({
    description: 'Email address or mobile number tied to the account',
    example: '9800000000',
  })
  @IsString()
  @IsNotEmpty()
  identifier!: string;
}
