import {
  IsNotEmpty,
  IsOptional,
  Matches,
  MinLength,
  Validate,
} from "class-validator";
import { Match, Unique } from "../helpers/validator";

export class RegisterDto {
  @IsNotEmpty({ message: "فیلد نام ضروری است" })
  name: string;

  @Matches(/^(\+98|0)?9\d{9}$/, { message: "موبایل معتبر نیست" })
  @Validate(Unique, ["user", "mobile"], {
    message: "شماره موبایل از قبل وجود دراد",
  })
  mobile: string;

  @IsNotEmpty()
  @MinLength(6)
  password: string;

  @IsNotEmpty()
  @Match(RegisterDto, (d) => d.password)
  passwordConfirm: string;

  @IsOptional()
  pushToken: string;

  avatar: string;
}
