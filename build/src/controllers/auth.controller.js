"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
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
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthController = void 0;
const routing_controllers_1 = require("routing-controllers");
const base_controller_1 = __importDefault(require("./base.controller"));
const register_dto_1 = require("../entities/register.dto");
const prisma_1 = require("../helpers/prisma");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const login_dto_1 = require("../entities/login.dto");
const mappers_1 = require("../helpers/mappers");
const admin = __importStar(require("firebase-admin"));
// Initialize Firebase Admin (do this once in your application startup)
if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert({
            projectId: process.env.FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey: (_a = process.env.FIREBASE_PRIVATE_KEY) === null || _a === void 0 ? void 0 : _a.replace(/\\n/g, "\n"),
        }),
    });
}
const secretKey = process.env.SECRET_KEY;
let AuthController = class AuthController extends base_controller_1.default {
    register(dto) {
        return __awaiter(this, void 0, void 0, function* () {
            const user = yield prisma_1.prisma.user.create({
                data: {
                    name: dto.name,
                    mobile: dto.mobile,
                    avatar: dto.avatar,
                    pushToken: dto.pushToken,
                    id: dto.id,
                },
            });
            const token = jsonwebtoken_1.default.sign({ userId: user.id }, secretKey !== null && secretKey !== void 0 ? secretKey : "", {
                expiresIn: "10000000000h",
            });
            return { token, user: (0, mappers_1.userMapper)(user) };
        });
    }
    login(dto) {
        return __awaiter(this, void 0, void 0, function* () {
            const user = yield prisma_1.prisma.user.findUnique({
                where: { mobile: dto.mobile },
            });
            const token = jsonwebtoken_1.default.sign({ userId: user.id }, secretKey !== null && secretKey !== void 0 ? secretKey : "", {
                expiresIn: "10000000000h",
            });
            return { token, user: (0, mappers_1.userMapper)(user) };
        });
    }
    getProfile(user) {
        return __awaiter(this, void 0, void 0, function* () {
            return { user: (0, mappers_1.userMapper)(user) };
        });
    }
    sendPush(pushToken) {
        return __awaiter(this, void 0, void 0, function* () {
        });
    }
};
exports.AuthController = AuthController;
__decorate([
    (0, routing_controllers_1.Post)("/register"),
    __param(0, (0, routing_controllers_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [register_dto_1.RegisterDto]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "register", null);
__decorate([
    (0, routing_controllers_1.Post)("/login"),
    __param(0, (0, routing_controllers_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [login_dto_1.LoginDto]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "login", null);
__decorate([
    (0, routing_controllers_1.Get)("/profile"),
    __param(0, (0, routing_controllers_1.CurrentUser)({ required: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "getProfile", null);
__decorate([
    (0, routing_controllers_1.Get)("/send-push"),
    __param(0, (0, routing_controllers_1.Param)("pushToken")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "sendPush", null);
exports.AuthController = AuthController = __decorate([
    (0, routing_controllers_1.JsonController)("/auth")
], AuthController);
