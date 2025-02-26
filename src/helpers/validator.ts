import {
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
  registerDecorator,
  ValidationOptions,
} from "class-validator";
import { prisma } from "./prisma";
import { ClassConstructor } from "class-transformer";

@ValidatorConstraint({ name: "exists", async: true })
export class Exists implements ValidatorConstraintInterface {
  async validate(value: any, args: ValidationArguments) {
    const [model, field] = args.constraints;

    if (value === undefined) return true;

    const record = await (prisma[model] as any).findUnique({
      where: {
        [field]: value,
      },
    });

    return !!record;
  }

  defaultMessage(args: ValidationArguments) {
    const [model, field] = args.constraints;
    return `${field} '${args.value}' does not exist in ${model} database!`;
  }
}

@ValidatorConstraint({ name: "unique", async: true })
export class Unique implements ValidatorConstraintInterface {
  async validate(value: any, args: ValidationArguments) {
    const [model, field] = args.constraints;

    if (value === undefined) return true;

    const record = await (prisma[model] as any).findUnique({
      where: {
        [field]: value,
      },
    });

    return record == null;
  }

  defaultMessage(args: ValidationArguments) {
    const [model, field] = args.constraints;
    return `${field} '${args.value}' از قبل وجود دارد ${model}`;
  }
}

export const Match = <T>(
  type: ClassConstructor<T>,
  property: (o: T) => any,
  validationOptions?: ValidationOptions,
) => {
  return (object: any, propertyName: string) => {
    registerDecorator({
      target: object.constructor,
      propertyName,
      options: validationOptions,
      constraints: [property],
      validator: MatchConstraint,
    });
  };
};

@ValidatorConstraint({ name: "Match" })
export class MatchConstraint implements ValidatorConstraintInterface {
  validate(value: any, args: ValidationArguments) {
    const [fn] = args.constraints;
    return fn(args.object) === value;
  }

  defaultMessage(args: ValidationArguments) {
    const [constraintProperty]: (() => any)[] = args.constraints;
    return `${constraintProperty} and ${args.property} does not match`;
  }
}
