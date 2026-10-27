/**
 * =============================================================
 * Global Response Transform Interceptor
 * =============================================================
 * Wraps all successful responses in a consistent envelope:
 *
 * {
 *   success: true,
 *   data: <response payload>,
 *   timestamp: string
 * }
 *
 * This ensures the API always returns a predictable structure
 * regardless of which endpoint was called.
 * =============================================================
 */
import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

/**
 * Standard API response envelope
 */
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  timestamp: string;
}

@Injectable()
export class TransformInterceptor<T>
  implements NestInterceptor<T, ApiResponse<T>>
{
  intercept(
    _context: ExecutionContext,
    next: CallHandler,
  ): Observable<ApiResponse<T>> {
    return next.handle().pipe(
      map((data: T) => ({
        success: true,
        data,
        timestamp: new Date().toISOString(),
      })),
    );
  }
}
