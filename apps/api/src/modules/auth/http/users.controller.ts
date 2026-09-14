import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { updateMyProfileRequestSchema } from '@health/contracts';
import type { AuthenticatedPrincipal } from '../core/ports.js';
import { UserAccountApplicationService } from '../user-account-application.service.js';
import { AccessTokenGuard } from './access-token.guard.js';
import { CurrentPrincipal } from './current-principal.decorator.js';

@UseGuards(AccessTokenGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly users: UserAccountApplicationService) {}

  @Get('me') me(@CurrentPrincipal() principal: AuthenticatedPrincipal) {
    return this.users.getMe(principal.userId);
  }

  @Patch('me') updateMe(@CurrentPrincipal() principal: AuthenticatedPrincipal, @Body() body: unknown) {
    return this.users.updateMe(principal.userId, updateMyProfileRequestSchema.parse(body));
  }
}
