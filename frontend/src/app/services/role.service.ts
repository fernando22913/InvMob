import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../environments/environment';
import type { Role, RoleCreate } from '../models';

@Injectable({ providedIn: 'root' })
export class RoleService {
  private readonly base = `${environment.apiUrl}/roles`;

  constructor(private readonly http: HttpClient) {}

  /** `/roles` returns a plain array (no pagination envelope). */
  list(): Observable<Role[]> {
    return this.http.get<Role[]>(this.base);
  }

  create(body: RoleCreate): Observable<Role> {
    return this.http.post<Role>(this.base, body);
  }
}
