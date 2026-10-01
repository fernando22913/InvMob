import { HttpParams } from '@angular/common/http';

export type QueryValue = string | number | boolean | undefined | null;

/** Builds HttpParams omitting empty/undefined/null values (matches the API). */
export function buildParams(params: Record<string, QueryValue>): HttpParams {
  let httpParams = new HttpParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue;
    httpParams = httpParams.set(key, String(value));
  }
  return httpParams;
}
