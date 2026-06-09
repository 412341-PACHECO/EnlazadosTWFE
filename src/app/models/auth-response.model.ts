export interface AuthResponse {
  token: string;
  refreshToken: string;
  tokenType: string;
  expiresIn: number;
  userId?: string;
  id?: string;
  email: string;
  firstName?: string;
  lastName?: string;
  role: string;
}

export interface MessageResponse {
  message: string;
}
