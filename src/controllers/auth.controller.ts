import {
  Body,
  CurrentUser,
  Get,
  JsonController,
  Post,
  UploadedFile,
} from "routing-controllers";
import BaseController from "./base.controller";
import { uploadOptions } from "../helpers/storage";
import { RegisterDto } from "../entities/register.dto";
import { prisma } from "../helpers/prisma";
import jwt from "jsonwebtoken";
import { LoginDto } from "../entities/login.dto";
import { userMapper } from "../helpers/mappers";
import { User } from "@prisma/client";

const secretKey = process.env.SECRET_KEY;

@JsonController("/auth")
export class AuthController extends BaseController {
  @Post("/register")
  async register(
    @Body() dto: RegisterDto,
    @UploadedFile("avatar", { options: uploadOptions("avatars") }) file: any,
  ) {
    if (file) {
      dto.avatar = file.path.replace("public_html/", "");
    }

    const user = await prisma.user.create({
      data: {
        name: dto.name,
        mobile: dto.mobile,
        avatar: dto.avatar,
      },
    });
    const token = jwt.sign({ userId: user.id }, secretKey ?? "", {
      expiresIn: "10000000000h",
    });

    return { token, user: userMapper(user) };
  }

  @Post("/login")
  async login(@Body() dto: LoginDto) {
    const user = await prisma.user.findUnique({
      where: { mobile: dto.mobile },
    });

    const token = jwt.sign({ userId: user!.id }, secretKey ?? "", {
      expiresIn: "10000000000h",
    });

    return { token, user: userMapper(user!) };
  }

  @Get("/profile")
  async getProfile(@CurrentUser({ required: true }) user: User) {
    return { user: userMapper(user) };
  }
}
