import { HttpErrorResponse } from '@angular/common/http';

/** True when the API rejected the request because the user lacks admin rights. */
export function isForbidden(error: unknown): boolean {
  return error instanceof HttpErrorResponse && error.status === 403;
}

/** Normalizes an HttpErrorResponse into a display string. */
export function extractApiError(error: unknown): string {
  if (error instanceof HttpErrorResponse) {
    const detail = (error.error as { detail?: unknown } | null)?.detail;
    if (typeof detail === 'string' && detail.length > 0) {
      return detail;
    }
    if (Array.isArray(detail) && detail.length > 0) {
      const first = detail[0] as { msg?: string };
      if (typeof first?.msg === 'string') {
        return first.msg;
      }
    }
    if (error.status === 0) {
      return 'No se pudo conectar con el servidor';
    }
    return `Error ${error.status}`;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return 'Error inesperado';
}
