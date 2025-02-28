"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MatchConstraint = exports.Match = exports.Unique = exports.Exists = void 0;
const class_validator_1 = require("class-validator");
const prisma_1 = require("./prisma");
let Exists = class Exists {
    validate(value, args) {
        return __awaiter(this, void 0, void 0, function* () {
            const [model, field] = args.constraints;
            if (value === undefined)
                return true;
            const record = yield prisma_1.prisma[model].findUnique({
                where: {
                    [field]: value,
                },
            });
            return !!record;
        });
    }
    defaultMessage(args) {
        const [model, field] = args.constraints;
        return `${field} '${args.value}' does not exist in ${model} database!`;
    }
};
exports.Exists = Exists;
exports.Exists = Exists = __decorate([
    (0, class_validator_1.ValidatorConstraint)({ name: "exists", async: true })
], Exists);
let Unique = class Unique {
    validate(value, args) {
        return __awaiter(this, void 0, void 0, function* () {
            const [model, field] = args.constraints;
            if (value === undefined)
                return true;
            const record = yield prisma_1.prisma[model].findUnique({
                where: {
                    [field]: value,
                },
            });
            return record == null;
        });
    }
    defaultMessage(args) {
        const [model, field] = args.constraints;
        return `${field} '${args.value}' از قبل وجود دارد ${model}`;
    }
};
exports.Unique = Unique;
exports.Unique = Unique = __decorate([
    (0, class_validator_1.ValidatorConstraint)({ name: "unique", async: true })
], Unique);
const Match = (type, property, validationOptions) => {
    return (object, propertyName) => {
        (0, class_validator_1.registerDecorator)({
            target: object.constructor,
            propertyName,
            options: validationOptions,
            constraints: [property],
            validator: MatchConstraint,
        });
    };
};
exports.Match = Match;
let MatchConstraint = class MatchConstraint {
    validate(value, args) {
        const [fn] = args.constraints;
        return fn(args.object) === value;
    }
    defaultMessage(args) {
        const [constraintProperty] = args.constraints;
        return `${constraintProperty} and ${args.property} does not match`;
    }
};
exports.MatchConstraint = MatchConstraint;
exports.MatchConstraint = MatchConstraint = __decorate([
    (0, class_validator_1.ValidatorConstraint)({ name: "Match" })
], MatchConstraint);
