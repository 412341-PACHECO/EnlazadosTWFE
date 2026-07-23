import { PatientBasic } from './patient-basic.model';
import { ProfessionalContactSummary } from './contact-request.model';

export type AttendanceRecordStatus = 'PENDING' | 'BILLED';
export type AttendanceBillingStatus = 'PENDING' | 'AUDIT_SENT' | 'APPROVED' | 'LIQUIDATED';

export interface AttendanceRecordCreateRequest {
  professionalId: string;
  patientId: string;
  sessionDate: string;
  sessionFeeSnapshot: number;
  healthInsuranceName: string;
  healthInsuranceCoverageAmount: number | null;
  copaymentAmount: number | null;
  notes: string | null;
}

export interface AttendanceRecordUpdateRequest
  extends Partial<AttendanceRecordCreateRequest> {
  status?: AttendanceRecordStatus;
}

export interface AttendanceRecordResponse {
  id: string;
  professional: ProfessionalContactSummary;
  patient: PatientBasic;
  sessionDate: string;
  sessionFeeSnapshot: number;
  healthInsuranceName: string;
  healthInsuranceCoverageAmount: number | null;
  copaymentAmount: number | null;
  notes: string | null;
  status: AttendanceRecordStatus;
  createdAt: string;
  updatedAt: string;
}

export interface AttendanceBillingGenerateRequest {
  professionalId: string;
  billingPeriod: string;
  patientId: string | null;
  healthInsuranceName: string | null;
}

export interface AttendanceBillingStatusUpdateRequest {
  paymentStatus: AttendanceBillingStatus;
}

export interface AttendanceBillingResponse {
  id: string;
  professional: ProfessionalContactSummary;
  patient: PatientBasic | null;
  billingPeriod: string;
  healthInsuranceName: string | null;
  totalSessions: number;
  totalAmount: number;
  paymentStatus: AttendanceBillingStatus;
  digitalHash: string;
  attendanceRecordIds: string[];
  createdAt: string;
  updatedAt: string;
}
