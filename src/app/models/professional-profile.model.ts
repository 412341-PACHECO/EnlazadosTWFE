import { UserBasic } from './user-basic.model';

export interface ProfessionalProfile {
  user: UserBasic;
  specialty: string;
  licenseNumber: string;
  latitude: number;
  longitude: number;
  acceptedHealthInsurances: string[];
  sessionFee: number;
}
