"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const routing_controllers_1 = require("routing-controllers");
class BaseController {
    ok(data) {
        if (typeof data === "string") {
            return { success: true, message: data };
        }
        return Object.assign({ success: true }, data);
    }
    error(data) {
        throw new routing_controllers_1.HttpError(400, data);
    }
}
exports.default = BaseController;
