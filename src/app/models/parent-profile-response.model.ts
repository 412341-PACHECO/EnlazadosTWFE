import { PatientBasic } from './patient-basic.model';
import { RoleBasic } from './role-basic.model';

export interface ParentProfileResponse {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  isActive: boolean;
  enabled: boolean;
  role: RoleBasic;
  patients: PatientBasic[];
  createdAt: string;
  updatedAt: string;
}
