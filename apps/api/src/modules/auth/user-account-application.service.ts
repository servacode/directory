import { Injectable } from '@nestjs/common';
import { UserAccountService } from './core/user-account.service.js';
import { PgAuthUnitOfWork } from './persistence/pg-auth.unit-of-work.js';

@Injectable()
export class UserAccountApplicationService extends UserAccountService {
  constructor(uow: PgAuthUnitOfWork) { super(uow); }
}
