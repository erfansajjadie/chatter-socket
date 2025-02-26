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
const server = http_1.default.createServer(app);
(0, configSocket_1.default)(server);
server.listen(port, () => {
    console.log("Server is running");
});
