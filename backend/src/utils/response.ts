import { Response } from 'express';

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  meta?: Record<string, any>;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}

export function sendSuccess<T>(res: Response, data: T, meta?: Record<string, any>, status = 200) {
  const body: ApiResponse<T> = {
    success: true,
    data,
  };
  if (meta) {
    body.meta = meta;
  }
  return res.status(status).json(body);
}

export function sendError(
  res: Response,
  message: string,
  statusCode = 500,
  code = 'INTERNAL_SERVER_ERROR',
  details: any = null
) {
  const body: ApiResponse = {
    success: false,
    error: {
      code,
      message,
      details,
    },
  };
  return res.status(statusCode).json(body);
}
