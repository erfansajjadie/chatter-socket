import { IsArray, IsNotEmpty, Matches } from "class-validator";

export class ContactDto {
  @IsNotEmpty()
  @IsArray()
  @Matches(/^(\+98|0)?9\d{9}$/, {
    message: "شماره های وارد شده معتبر نیست",
    each: true,
  })
  mobiles: string[];
}
