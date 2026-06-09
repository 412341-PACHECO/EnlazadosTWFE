import { Patient } from './patient.model';

export interface PatientResponse extends Patient {
  id: string;
  createdAt: string;
  updatedAt: string;
}
