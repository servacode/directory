import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service.js';
@Controller('health')
export class HealthController {
  constructor(private readonly db:DatabaseService){}
  @Get('live') live(): { status: 'ok' } { return { status: 'ok' }; }
  @Get('ready') async ready():Promise<{status:'ok';service:'health-directory-api'}>{
    try{await this.db.ping();return{status:'ok',service:'health-directory-api'}}catch{throw new ServiceUnavailableException('Database unavailable')}
  }
}
