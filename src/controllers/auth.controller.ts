import {
  Body,
  CurrentUser,
  Get,
  JsonController,
  Param,
  Post,
} from "routing-controllers";
import BaseController from "./base.controller";
import { RegisterDto } from "../entities/register.dto";
import { prisma } from "../helpers/prisma";
import jwt from "jsonwebtoken";
import { LoginDto } from "../entities/login.dto";
import { userMapper } from "../helpers/mappers";
import { User } from "@prisma/client";
import * as admin from "firebase-admin";

// Initialize Firebase Admin (do this once in your application startup)
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    }),
  });
}

const secretKey = process.env.SECRET_KEY;

@JsonController("/auth")
export class AuthController extends BaseController {
  @Post("/register")
  async register(@Body() dto: RegisterDto) {
    const user = await prisma.user.create({
      data: {
        name: dto.name,
        mobile: dto.mobile,
        avatar: dto.avatar,
        pushToken: dto.pushToken,
        id: dto.id,
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

  @Get("/send-push")
  async sendPush(@Param("pushToken") pushToken: string) {
    try {
      const message = {
        notification: {
          title: "Test Notification",
          body: "This is a test notification from Chatter!",
        },
        data: {
          testData: "Test data goes here",
        },
        token: pushToken,
      };

      // Send the message using Firebase Admin
      const response = await admin.messaging().send(message);

      return {
        message: "Push notification sent",
        pushToken,
        messageId: response,
      };
    } catch (error: any) {
      return {
        message: "Failed to send push notification",
        error: error.message,
        pushToken,
      };
    }
  }
}
