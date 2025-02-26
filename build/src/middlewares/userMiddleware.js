"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.userMiddleware = void 0;
const client_1 = require("@prisma/client");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const userMiddleware = (action) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const prisma = new client_1.PrismaClient();
    const token = action.request.headers["authorization"];
    if (!token) {
        return null;
    }
    try {
        const decoded = jsonwebtoken_1.default.verify(token.replace("Bearer ", ""), (_a = process.env.SECRET_KEY) !== null && _a !== void 0 ? _a : "");
        const userId = decoded.userId;
        return prisma.user.findUnique({ where: { id: userId } });
    }
    catch (err) {
        console.log(err);
        return null;
    }
});
exports.userMiddleware = userMiddleware;
