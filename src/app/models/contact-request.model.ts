export type ContactRequestStatus = 'PENDING' | 'VIEWED';

export interface ContactRequestCreateRequest {
  professionalId: string;
  patientId: string | null;
  shareEmail: boolean;
  sharePhone: boolean;
  parentPhone: string | null;
  message: string | null;
}

export interface ContactRequestResponse {
  id: string;
  parentUserId: string;
  professionalId: string;
  patientId: string | null;
  parentFullName: string;
  parentEmail: string | null;
  parentPhone: string | null;
  patientFullName: string | null;
  message: string | null;
  status: ContactRequestStatus;
  createdAt: string;
  updatedAt: string;
}

export interface ProfessionalContactSummary {
  professionalProfileId: string;
  userId: string;
  firstName: string;
  lastName: string;
  specialty: string;
  acceptedHealthInsurances: string[];
  sessionFee: number | null;
}

export interface ParentContactRequestResponse {
  id: string;
  parentUserId: string;
  professionalId: string;
  patientId: string | null;
  parentFullName: string;
  parentEmail: string | null;
  parentPhone: string | null;
  patientFullName: string | null;
  message: string | null;
  status: ContactRequestStatus;
  professional: ProfessionalContactSummary;
  createdAt: string;
  updatedAt: string;
}
