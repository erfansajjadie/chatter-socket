import { Client } from "basic-ftp";
import multer from "multer";
import { Readable } from "stream";

// eslint-disable-next-line @typescript-eslint/no-var-requires
const FTPStorage = require("multer-ftp");

export const uploadOptions = (path: string) => ({
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

export const fileUploadOptions = () => ({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, "/"); // Set the destination folder to "avatars/"
    },
    filename: (req, file, cb) => {
      cb(null, file.originalname); // Use the original filename
    },
  }),
});

export async function uploadBase64(file: string, type: string) {
  const client = new Client();

  try {
    await client.access({
      host: process.env.FTP_HOST,
      user: process.env.FTP_USER,
      password: process.env.FTP_PASS,
      secure: false,
    });

    const base64Data = file;

    // Decode Base64 to binary
    const buffer = Buffer.from(base64Data, "base64");

    // Convert the Buffer to a Readable stream
    const stream = new Readable();
    stream.push(buffer);
    stream.push(null); // End the stream

    const { FTP_URL } = process.env;
    const timestamp = Date.now();
    const path = "chat-files";
    const filename = `${FTP_URL}${path}/${timestamp}.${type}`;

    // Upload the PDF to the FTP server
    await client.uploadFrom(stream, filename);

    console.log("Upload successful: " + filename);

    return filename;
  } catch (err) {
    console.error("Error:", err);
  } finally {
    // Close the FTP connection
    client.close();
  }
}
