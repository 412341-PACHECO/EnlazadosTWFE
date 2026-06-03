import { ProfessionalProfile } from './professional-profile.model';

export interface ProfessionalProfileResponse extends ProfessionalProfile {
  id: string;
  createdAt: string;
  updatedAt: string;
}
