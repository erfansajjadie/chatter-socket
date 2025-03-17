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
Object.defineProperty(exports, "__esModule", { value: true });
exports.StorageController = void 0;
const routing_controllers_1 = require("routing-controllers");
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const base_controller_1 = __importDefault(require("./base.controller"));
const crypto = __importStar(require("crypto"));
let StorageController = class StorageController extends base_controller_1.default {
    uploadFile(file) {
        const _super = Object.create(null, {
            ok: { get: () => super.ok },
            error: { get: () => super.error }
        });
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Define storage path at project root level
                const uploadDir = path_1.default.join(__dirname, "..", "..", "uploads");
                if (!fs_1.default.existsSync(uploadDir)) {
                    fs_1.default.mkdirSync(uploadDir, { recursive: true });
                }
                // Generate a random name for the file
                const randomName = crypto.randomBytes(16).toString("hex"); // Generate 16-byte random name
                const fileExtension = path_1.default.extname(file.originalname); // Get the file extension
                const newFileName = `${randomName}${fileExtension}`; // Create new random file name with extension
                // Define file path and save the file
                const filePath = path_1.default.join(uploadDir, newFileName);
                fs_1.default.writeFileSync(filePath, file.buffer);
                // Generate file URL
                const fileUrl = `uploads/${newFileName}`;
                // Return the file URL
                return _super.ok.call(this, { message: "File uploaded successfully", url: fileUrl });
            }
            catch (error) {
                return _super.error.call(this, {
                    message: "File upload failed",
                    error: error.message,
                });
            }
        });
    }
};
exports.StorageController = StorageController;
__decorate([
    (0, routing_controllers_1.Body)({ options: { limit: "250mb" } }),
    (0, routing_controllers_1.Post)("/upload"),
    __param(0, (0, routing_controllers_1.UploadedFile)("file", { required: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], StorageController.prototype, "uploadFile", null);
exports.StorageController = StorageController = __decorate([
    (0, routing_controllers_1.JsonController)(),
    (0, routing_controllers_1.Body)({ options: { limit: "250mb" } })
], StorageController);
