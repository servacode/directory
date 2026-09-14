import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../../database/database.service.js';
import type { AuthStore, AuthUnitOfWork } from '../core/ports.js';
import { PgAuthStore } from './pg-auth.store.js';

@Injectable()
export class PgAuthUnitOfWork implements AuthUnitOfWork {
  constructor(private readonly database: DatabaseService) {}
  run<T>(work: (store: AuthStore) => Promise<T>): Promise<T> {
    return this.database.transaction((client) => work(new PgAuthStore(client)));
  }
}
