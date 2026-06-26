import { PatientResponse } from './patient-response.model';
import { TherapeuticTeamResponse } from './therapeutic-team.model';
import { UserBasic } from './user-basic.model';

export type TherapeuticTeamInvitationStatus = 'PENDING' | 'ACCEPTED' | 'EXPIRED' | 'CANCELLED';

export interface TherapeuticTeamInvitationCreateRequest {
  invitedEmail: string;
  startDate: string;
  endDate?: string | null;
}

export interface TherapeuticTeamInvitationAcceptRequest {
  token: string;
}

export interface TherapeuticTeamInvitationResponse {
  id: string;
  patient: PatientResponse;
  invitedEmail: string;
  invitedByUser: UserBasic;
  status: TherapeuticTeamInvitationStatus;
  startDate: string;
  endDate: string | null;
  expiresAt: string;
  acceptedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TherapeuticTeamInvitationTokenInfo {
  invitedEmail: string;
  invitedByFullName: string;
  patientFullName: string;
  status: TherapeuticTeamInvitationStatus;
  startDate: string;
  endDate: string | null;
  expiresAt: string;
  userAlreadyRegistered: boolean;
  professionalProfileAlreadyCreated: boolean;
}

export interface TherapeuticTeamInvitationAcceptResponse extends TherapeuticTeamResponse {}
