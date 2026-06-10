import "express";

declare module "express" {
  export interface Request {
    cookies?: Record<string, any>;
  }
}

