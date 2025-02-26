import { IsNotEmpty, IsOptional, Matches, Validate } from "class-validator";
import { Unique } from "../helpers/validator";

export class RegisterDto {
  @IsNotEmpty({ message: "فیلد نام ضروری است" })
  name: string;

  @Matches(/^(\+98|0)?9\d{9}$/, { message: "موبایل معتبر نیست" })
  @Validate(Unique, ["user", "mobile"], {
    message: "شماره موبایل از قبل وجود ندارد",
  })
  mobile: string;

  @IsOptional()
  pushToken: string;

  avatar: string;
}
