import { ConversationType } from "@prisma/client";
import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  Validate,
  ValidateIf,
} from "class-validator";
import { Exists } from "../helpers/validator";
import { Transform } from "class-transformer";

export class ConversationDto {
  @IsNotEmpty()
  @IsEnum(ConversationType)
  type: ConversationType;

  @IsNotEmpty()
  @Transform((obj) => obj.value.map((v: string) => parseInt(v)))
  @Validate(Exists, ["user", "id"], { each: true })
  participants: number[];

  @IsNotEmpty()
  @ValidateIf((obj) => obj.type === ConversationType.GROUP)
  name?: string;

  @IsNotEmpty()
  userId: number;

  @IsOptional()
  isPublic?: boolean = false;

  @IsOptional()
  description: string;
}
