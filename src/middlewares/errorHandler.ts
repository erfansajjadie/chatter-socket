import {
  ExpressErrorMiddlewareInterface,
  Middleware,
} from "routing-controllers";

@Middleware({ type: "after" })
export class GlobalErrorHandler implements ExpressErrorMiddlewareInterface {
  error(error: any, _req: any, res: any, _next: (err?: any) => any) {
    if (error.httpCode) {
      res.status(error.httpCode);
    } else {
      res.status(500).json({
        message: error.message,
      });
    }

    const response: any = {
      success: false,
      errors: [],
    };

    if (error.errors && Array.isArray(error.errors)) {
      response.errors = error.errors.map((err: any) => {
        return err.constraints ? Object.values(err.constraints)[0] : [];
      });
    } else {
      response.errors = [error.message];
    }

    res.json(response);
  }
}
