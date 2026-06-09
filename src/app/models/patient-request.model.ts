export interface PatientCreateRequest {
  firstName: string;
  lastName: string;
  diagnosis: string;
  parentId: string;
  institutionId: string | null;
}

export interface PatientUpdateRequest extends Partial<PatientCreateRequest> {}
