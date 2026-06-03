export interface ProfessionalProfileCreateRequest {
  userId: string;
  specialty: string;
  licenseNumber: string;
  latitude: number;
  longitude: number;
  acceptedHealthInsurances: string[];
  sessionFee: number;
}

export interface ProfessionalProfileUpdateRequest
  extends Partial<Omit<ProfessionalProfileCreateRequest, 'userId'>> {}
