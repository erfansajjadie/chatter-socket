import { IsNotEmpty, Validate } from "class-validator";
import { Exists } from "../helpers/validator";

export class LoginDto {
  @IsNotEmpty()
  @Validate(Exists, ["user", "mobile"], {
    message: "رمز عبور یا شماره موبایل اشتباه است",
  })
  mobile: string;

  @IsNotEmpty()
  password: string;
}
