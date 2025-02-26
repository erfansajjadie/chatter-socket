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
exports.uploadBase64 = exports.fileUploadOptions = exports.uploadOptions = void 0;
const basic_ftp_1 = require("basic-ftp");
const multer_1 = __importDefault(require("multer"));
const stream_1 = require("stream");
// eslint-disable-next-line @typescript-eslint/no-var-requires
const FTPStorage = require("multer-ftp");
const uploadOptions = (path) => ({
    storage: new FTPStorage({
        basepath: "",
        ftp: {
            host: process.env.FTP_HOST,
            secure: false,
            user: process.env.FTP_USER,
            password: process.env.FTP_PASS,
        },
    }),
});
exports.uploadOptions = uploadOptions;
const fileUploadOptions = () => ({
    storage: multer_1.default.diskStorage({
        destination: (req, file, cb) => {
            cb(null, "/"); // Set the destination folder to "avatars/"
        },
        filename: (req, file, cb) => {
            cb(null, file.originalname); // Use the original filename
        },
    }),
});
exports.fileUploadOptions = fileUploadOptions;
function uploadBase64(file, type) {
    return __awaiter(this, void 0, void 0, function* () {
        const client = new basic_ftp_1.Client();
        try {
            yield client.access({
                host: process.env.FTP_HOST,
                user: process.env.FTP_USER,
                password: process.env.FTP_PASS,
                secure: false,
            });
            const base64Data = file;
            // Decode Base64 to binary
            const buffer = Buffer.from(base64Data, "base64");
            // Convert the Buffer to a Readable stream
            const stream = new stream_1.Readable();
            stream.push(buffer);
            stream.push(null); // End the stream
            const { FTP_URL } = process.env;
            const timestamp = Date.now();
            const path = "chat-files";
            const filename = `${FTP_URL}${path}/${timestamp}.${type}`;
            // Upload the PDF to the FTP server
            yield client.uploadFrom(stream, filename);
            console.log("Upload successful: " + filename);
            return filename;
        }
        catch (err) {
            console.error("Error:", err);
        }
        finally {
            // Close the FTP connection
            client.close();
        }
    });
}
exports.uploadBase64 = uploadBase64;
