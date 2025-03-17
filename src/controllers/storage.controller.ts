import { JsonController, Post, UploadedFile, Body } from "routing-controllers";
import path from "path";
import fs from "fs";
import BaseController from "./base.controller";
import * as crypto from "crypto";

@JsonController()
@Body({ options: { limit: "250mb" } })
export class StorageController extends BaseController {
  @Body({ options: { limit: "250mb" } })
  @Post("/upload")
  async uploadFile(@UploadedFile("file", { required: true }) file: any) {
    try {
      // Define storage path
      const uploadDir = path.join(__dirname, "..", "uploads");
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }

      // Generate a random name for the file
      const randomName = crypto.randomBytes(16).toString("hex"); // Generate 16-byte random name
      const fileExtension = path.extname(file.originalname); // Get the file extension
      const newFileName = `${randomName}${fileExtension}`; // Create new random file name with extension

      // Define file path and save the file
      const filePath = path.join(uploadDir, newFileName);
      fs.writeFileSync(filePath, file.buffer);

      // Generate file URL
      const fileUrl = `uploads/${newFileName}`;

      // Return the file URL
      return super.ok({ message: "File uploaded successfully", url: fileUrl });
    } catch (error: any) {
      return super.error({
        message: "File upload failed",
        error: error.message,
      });
    }
  }
}
