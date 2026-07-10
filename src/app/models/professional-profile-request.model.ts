export interface ProfessionalProfileCreateRequest {
  userId: string;
  specialty: string;
  licenseNumber: string;
  latitude: number;
  longitude: number;
  acceptedHealthInsurances: string[];
  sessionFee: number;
  coverageRadiusKm?: number | null;
}

export interface ProfessionalProfileUpdateRequest
  extends Partial<Omit<ProfessionalProfileCreateRequest, 'userId'>> {}
