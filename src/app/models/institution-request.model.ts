export interface InstitutionCreateRequest {
  name: string;
  type: string;
  address: string;
  latitude: number;
  longitude: number;
}

export interface InstitutionUpdateRequest extends Partial<InstitutionCreateRequest> {}
