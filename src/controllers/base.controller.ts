import { HttpError } from "routing-controllers";

class BaseController {
  ok(data?: any | string) {
    if (typeof data === "string") {
      return { success: true, message: data };
    }
    return { success: true, ...data };
  }

  error(data?: any | string) {
    throw new HttpError(400, data);
  }
}

export default BaseController;
