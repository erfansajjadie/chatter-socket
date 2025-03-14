import http from "http";
import "reflect-metadata";
import configureSocket from "./src/helpers/configSocket";
import path from "path";
import { createExpressServer } from "routing-controllers";
import { GlobalErrorHandler } from "./src/middlewares/errorHandler";
import { userMiddleware } from "./src/middlewares/userMiddleware";
import dotenv from "dotenv";
import * as admin from "firebase-admin";
import serviceAccount from "./firebase.json";

dotenv.config();
dotenv.config({ path: `.env.local`, override: true });

const app = createExpressServer({
  controllers: [path.join(__dirname, "src/controllers", "*.{ts,js}")],
  routePrefix: "/api/v1",
  currentUserChecker: userMiddleware,
  middlewares: [GlobalErrorHandler],
  defaultErrorHandler: false,
  cors: true,
});

const port = process.env.PORT || 3000;

const server = http.createServer(app);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
});

configureSocket(server);

server.listen(port, () => {
  console.log("Server is running");
});
