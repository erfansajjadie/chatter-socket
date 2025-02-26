import { PrismaClient } from "@prisma/client";
import { Action } from "routing-controllers";
import jwt from "jsonwebtoken";

export const userMiddleware = async (action: Action) => {
  const prisma = new PrismaClient();
  const token = action.request.headers["authorization"];

  if (!token) {
    return null;
  }
  try {
    const decoded = jwt.verify(
      token.replace("Bearer ", ""),
      process.env.SECRET_KEY ?? "",
    );

    const userId = (decoded as any).userId;

    return prisma.user.findUnique({ where: { id: userId } });
  } catch (err) {
    console.log(err);

    return null;
  }
};
