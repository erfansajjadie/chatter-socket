"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GlobalErrorHandler = void 0;
const routing_controllers_1 = require("routing-controllers");
let GlobalErrorHandler = exports.GlobalErrorHandler = class GlobalErrorHandler {
    error(error, _req, res, _next) {
        if (error.httpCode) {
            res.status(error.httpCode);
        }
        else {
            res.status(500).json({
                message: error.message,
            });
        }
        const response = {
            success: false,
            errors: [],
        };
        if (error.errors && Array.isArray(error.errors)) {
            response.errors = error.errors.map((err) => {
                return err.constraints ? Object.values(err.constraints)[0] : [];
            });
        }
        else {
            response.errors = [error.message];
        }
        res.json(response);
    }
};
exports.GlobalErrorHandler = GlobalErrorHandler = __decorate([
    (0, routing_controllers_1.Middleware)({ type: "after" })
], GlobalErrorHandler);
