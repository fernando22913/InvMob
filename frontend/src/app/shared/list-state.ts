import { Observable, catchError, map, of, startWith } from 'rxjs';

import { extractApiError, isForbidden } from '../core/api-error';
import type { PaginatedResponse } from '../models';

/** Common loading / error / data shape used by every list page. */
export interface ListState<T> {
  loading: boolean;
  error: string | null;
  forbidden: boolean;
  data: PaginatedResponse<T> | null;
}

/**
 * Wraps a paginated request into the shared list-state shape, turning any
 * failure into a displayable error (and flagging 403 so admin pages can show a
 * dedicated "restricted" state instead of a generic error).
 */
export function toListState<T>(
  source: Observable<PaginatedResponse<T>>
): Observable<ListState<T>> {
  return source.pipe(
    map((data) => ({ loading: false, error: null, forbidden: false, data })),
    startWith({ loading: true, error: null, forbidden: false, data: null }),
    catchError((err) =>
      of({
        loading: false,
        error: extractApiError(err),
        forbidden: isForbidden(err),
        data: null,
      })
    )
  );
}
