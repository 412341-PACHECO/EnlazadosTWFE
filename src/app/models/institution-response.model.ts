import { Institution } from './institution.model';

export interface InstitutionResponse extends Institution {
  id: string;
  createdAt: string;
  updatedAt: string;
}
