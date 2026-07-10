import { UserBasic } from './user-basic.model';

export interface ProfessionalProfileMapResponse {
  id: string;
  user: UserBasic;
  specialty: string;
  licenseNumber: string;
  latitude: number;
  longitude: number;
  coverageRadiusKm: number | null;
  distanceKm: number;
}
