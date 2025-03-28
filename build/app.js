"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const http_1 = __importDefault(require("http"));
require("reflect-metadata");
const configSocket_1 = __importDefault(require("./src/helpers/configSocket"));
const path_1 = __importDefault(require("path"));
const routing_controllers_1 = require("routing-controllers");
const errorHandler_1 = require("./src/middlewares/errorHandler");
const userMiddleware_1 = require("./src/middlewares/userMiddleware");
const dotenv_1 = __importDefault(require("dotenv"));
const body_parser_1 = __importDefault(require("body-parser"));
const express_1 = __importDefault(require("express"));
dotenv_1.default.config();
dotenv_1.default.config({ path: `.env.local`, override: true });
const app = (0, routing_controllers_1.createExpressServer)({
    controllers: [path_1.default.join(__dirname, "src/controllers", "*.{ts,js}")],
    routePrefix: "/api/v1",
    currentUserChecker: userMiddleware_1.userMiddleware,
    middlewares: [errorHandler_1.GlobalErrorHandler],
    defaultErrorHandler: false,
    cors: true,
});
const port = process.env.PORT || 3000;
app.use(body_parser_1.default.json({ limit: "50mb" }));
app.use(body_parser_1.default.urlencoded({ limit: "50mb", extended: true }));
// Serve files from the 'uploads' folder
app.use("/uploads", express_1.default.static(path_1.default.join(__dirname, "uploads")));
const server = http_1.default.createServer(app);
/* admin.initializeApp({
  credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
});
 */
(0, configSocket_1.default)(server);
server.listen(port, () => {
    console.log("Server is running");
});
