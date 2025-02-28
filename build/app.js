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
const admin = __importStar(require("firebase-admin"));
const firebase_json_1 = __importDefault(require("./firebase.json"));
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
admin.initializeApp({
    credential: admin.credential.cert(firebase_json_1.default),
});
(0, configSocket_1.default)(server);
server.listen(port, () => {
    console.log("Server is running");
});
