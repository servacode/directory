import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Pool, types, type PoolClient, type QueryResult, type QueryResultRow } from 'pg';

@Injectable()
export class DatabaseService implements OnModuleDestroy {
  private readonly pool: Pool;
  private readonly logger = new Logger(DatabaseService.name);
  private readonly slowQueryMs: number;

  constructor(config: ConfigService) {
    types.setTypeParser(1184, (value) => value);
    types.setTypeParser(1114, (value) => value);
    const connectionString = config.get<string>('DATABASE_URL');
    if (!connectionString) throw new Error('DATABASE_URL is required');
    this.slowQueryMs = Number(config.get('DATABASE_SLOW_QUERY_MS') ?? 250);
    this.pool = new Pool({
      connectionString,
      max: Number(config.get('DATABASE_POOL_MAX') ?? 10),
      connectionTimeoutMillis: Number(config.get('DATABASE_CONNECTION_TIMEOUT_MS') ?? 5_000),
      idleTimeoutMillis: Number(config.get('DATABASE_IDLE_TIMEOUT_MS') ?? 30_000),
      statement_timeout: Number(config.get('DATABASE_STATEMENT_TIMEOUT_MS') ?? 8_000),
    });
  }

  async query<R extends QueryResultRow = QueryResultRow>(text: string, values: readonly unknown[] = []): Promise<QueryResult<R>> {
    const start=performance.now();
    try{return await this.pool.query<R>(text,[...values]);}
    finally{this.reportSlow(text,performance.now()-start);}
  }

  async ping():Promise<void>{await this.query('SELECT 1 AS ok')}

  async transaction<T>(work: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    const start=performance.now();
    try {
      await client.query('BEGIN');
      const result = await work(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
      const duration=performance.now()-start;
      if(duration>=this.slowQueryMs)this.logger.warn({event:'slow_db_transaction',durationMs:Math.round(duration)});
    }
  }

  private reportSlow(text:string,durationMs:number):void{
    if(durationMs<this.slowQueryMs)return;
    const operation=text.trim().split(/\s+/,1)[0]?.toUpperCase()??'QUERY';
    this.logger.warn({event:'slow_db_query',operation,durationMs:Math.round(durationMs)});
  }

  async onModuleDestroy(): Promise<void> { await this.pool.end(); }
}
