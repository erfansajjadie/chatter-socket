import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";

export function saveFile(file: any, subfolderName: string): string {
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
  } catch (error) {
    console.error("Error saving file:", error);
    throw new Error("Could not save the file.");
  }
}
