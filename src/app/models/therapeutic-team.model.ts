import { PatientResponse } from './patient-response.model';
import { ProfessionalProfileResponse } from './professional-profile-response.model';

export interface TherapeuticTeamCreateRequest {
  patientId: string;
  professionalId: string;
  startDate: string;
  endDate?: string | null;
}

export interface TherapeuticTeamUpdateRequest extends Partial<TherapeuticTeamCreateRequest> {}

export interface TherapeuticTeamResponse {
  id: string;
  patient: PatientResponse;
  professional: ProfessionalProfileResponse;
  startDate: string;
  endDate: string | null;
  createdAt: string;
  updatedAt: string;
}
