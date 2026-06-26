import { PatientResponse } from './patient-response.model';
import { UserBasic } from './user-basic.model';

export type DailyReportPriority = 'LOW' | 'MEDIUM' | 'HIGH';

export interface DailyReportCreateRequest {
  patientId: string;
  authorId: string;
  content: string;
  priority: DailyReportPriority;
  sentimentScore: number;
}

export interface DailyReportUpdateRequest extends Partial<DailyReportCreateRequest> {}

export interface DailyReportResponse {
  id: string;
  patient: PatientResponse;
  author: UserBasic;
  content: string;
  priority: DailyReportPriority;
  sentimentScore: number | null;
  createdAt: string;
  updatedAt: string;
}
