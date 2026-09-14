import { randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import type { TemporaryClosureRequest } from '@health/contracts';
import { DatabaseService } from '../../database/database.service.js';
import { FacilityDomainError } from '../facilities/facility-domain.error.js';
import { FacilityPermissionService } from '../facilities/facility-permission.service.js';

@Injectable()
export class TemporaryClosureService {
  constructor(private readonly db:DatabaseService,private readonly permissions:FacilityPermissionService){}

  async active(userId:string,facilityId:string){
    await this.permissions.assertOwner(this.db,userId,facilityId);
    const r=await this.db.query<{id:string;facilityId:string;startsAt:string;endsAt:string;reason:string|null;cancelledAt:string|null}>(
      `SELECT id,facility_id AS "facilityId",starts_at AS "startsAt",ends_at AS "endsAt",reason,cancelled_at AS "cancelledAt"
         FROM temporary_closures
        WHERE facility_id=$1 AND cancelled_at IS NULL AND ends_at>NOW()
        ORDER BY starts_at ASC LIMIT 1`,[facilityId]);
    const row=r.rows[0];
    return row?{id:row.id,facilityId:row.facilityId,startsAt:row.startsAt,endsAt:row.endsAt,...(row.reason?{reason:row.reason}:{}),...(row.cancelledAt?{cancelledAt:row.cancelledAt}:{})}:null;
  }
  async create(userId:string,facilityId:string,input:TemporaryClosureRequest){
    return this.db.transaction(async(client)=>{
      await this.permissions.assertOwner(client,userId,facilityId);
      const f=await client.query<{status:string}>(`SELECT status FROM facilities WHERE id=$1 FOR UPDATE`,[facilityId]);
      if(f.rows[0]?.status!=='ACTIVE') throw new FacilityDomainError('FACILITY_NOT_ACTIVE','Only active facilities can be temporarily closed.');
      const id=randomUUID();
      try{await client.query(`INSERT INTO temporary_closures(id,facility_id,starts_at,ends_at,reason,created_by) VALUES($1,$2,$3,$4,$5,$6)`,[id,facilityId,input.startsAt,input.endsAt,input.reason??null,userId]);}
      catch(error){const pg=error as {code?:string};if(pg.code==='23P01')throw new FacilityDomainError('TEMPORARY_CLOSURE_OVERLAP','Temporary closure overlaps an existing closure.');throw error;}
      return {id,facilityId,...input};
    });
  }
  async cancel(userId:string,facilityId:string,closureId:string){
    return this.db.transaction(async(client)=>{
      await this.permissions.assertOwner(client,userId,facilityId);
      const r=await client.query<{cancelledAt:string|null}>(`SELECT cancelled_at AS "cancelledAt" FROM temporary_closures WHERE id=$1 AND facility_id=$2 FOR UPDATE`,[closureId,facilityId]);
      if(!r.rows[0])throw new FacilityDomainError('TEMPORARY_CLOSURE_NOT_FOUND','Closure not found.');
      if(r.rows[0].cancelledAt)throw new FacilityDomainError('TEMPORARY_CLOSURE_ALREADY_CANCELLED','Closure already cancelled.');
      await client.query(`UPDATE temporary_closures SET cancelled_at=NOW() WHERE id=$1`,[closureId]);
      return {ok:true as const};
    });
  }
}
