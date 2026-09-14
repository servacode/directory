import { Injectable } from '@nestjs/common';
import type { QueryResultRow } from 'pg';
import { FacilityDomainError } from './facility-domain.error.js';

export interface SqlExecutor {
  query<R extends QueryResultRow = QueryResultRow>(text: string, values?: readonly unknown[]): Promise<{ rows: R[]; rowCount: number | null }>;
}

type EditableFacility = { specialization: string; status: string };
const SENSITIVE_EDITABLE = new Set(['DRAFT','REJECTED','REVERIFICATION_REQUIRED']);
const OPERATIONAL_EDITABLE = new Set(['DRAFT','REJECTED','REVERIFICATION_REQUIRED','ACTIVE','SUSPENDED']);

@Injectable()
export class FacilityPermissionService {
  async assertOwner(executor: SqlExecutor, userId: string, facilityId: string): Promise<void> {
    const result = await executor.query<{ exists: boolean }>(
      `SELECT EXISTS(SELECT 1 FROM facility_members WHERE facility_id=$1 AND user_id=$2 AND role='OWNER') AS exists`,
      [facilityId,userId],
    );
    if (result.rows[0]?.exists !== true) throw new FacilityDomainError('NOT_FACILITY_OWNER','Facility owner permission required.');
  }

  private async loadForEdit(executor: SqlExecutor,userId:string,facilityId:string):Promise<EditableFacility>{
    await this.assertOwner(executor,userId,facilityId);
    const result=await executor.query<EditableFacility>(`SELECT specialization,status FROM facilities WHERE id=$1 FOR UPDATE`,[facilityId]);
    const facility=result.rows[0];
    if(!facility)throw new FacilityDomainError('FACILITY_NOT_FOUND','Facility not found.');
    return facility;
  }

  async assertSensitiveEditableOwner(executor:SqlExecutor,userId:string,facilityId:string):Promise<EditableFacility>{
    const facility=await this.loadForEdit(executor,userId,facilityId);
    if(!SENSITIVE_EDITABLE.has(facility.status)){
      throw new FacilityDomainError('REVERIFICATION_REQUIRED','Sensitive facility details are locked after approval. Request re-verification before changing them.');
    }
    return facility;
  }

  async assertOperationalEditableOwner(executor:SqlExecutor,userId:string,facilityId:string):Promise<EditableFacility>{
    const facility=await this.loadForEdit(executor,userId,facilityId);
    if(!OPERATIONAL_EDITABLE.has(facility.status))throw new FacilityDomainError('INVALID_FACILITY_TRANSITION','Facility is not editable in its current state.');
    return facility;
  }

  /** Compatibility alias for low-risk operational edits only. */
  assertEditableOwner(executor:SqlExecutor,userId:string,facilityId:string){return this.assertOperationalEditableOwner(executor,userId,facilityId)}
}
