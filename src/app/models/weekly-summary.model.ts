import { PatientBasic } from './patient-basic.model';

export interface WeeklySummaryGenerateRequest {
  patientId: string;
  referenceDate?: string | null;
}

export interface WeeklySummaryResponse {
  id: string;
  patient: PatientBasic;
  weekStart: string;
  weekEnd: string;
  summaryContent: string;
  reportsCount: number;
  generatedAt: string;
  modelName: string;
  createdAt: string;
  updatedAt: string;
}
