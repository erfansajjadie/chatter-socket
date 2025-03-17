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
Object.defineProperty(exports, "__esModule", { value: true });
exports.saveFile = saveFile;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const crypto = __importStar(require("crypto"));
function saveFile(file, subfolderName) {
    try {
        // Define the uploads directory and its subfolder
        const baseUploadDir = path.join(__dirname, "..", "..", "uploads");
        const subfolderPath = path.join(baseUploadDir, subfolderName);
        // Create the base uploads directory if it doesn't exist
        if (!fs.existsSync(baseUploadDir)) {
            fs.mkdirSync(baseUploadDir, { recursive: true });
        }
        // Create the subfolder if it doesn't exist
        if (!fs.existsSync(subfolderPath)) {
            fs.mkdirSync(subfolderPath, { recursive: true });
        }
        // Generate a random name for the file
        const randomName = crypto.randomBytes(16).toString("hex"); // Generate 16-byte random name
        const fileExtension = path.extname(file.originalname); // Get the file extension
        const newFileName = `${randomName}${fileExtension}`; // Create new random file name with extension
        // Define file path and save the file
        const filePath = path.join(subfolderPath, newFileName);
        fs.writeFileSync(filePath, file.buffer);
        // Generate file URL (relative to the uploads folder)
        return `uploads/${subfolderName}/${newFileName}`;
    }
    catch (error) {
        console.error("Error saving file:", error);
        throw new Error("Could not save the file.");
    }
}
