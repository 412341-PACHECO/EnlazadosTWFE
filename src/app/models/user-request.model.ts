export interface UserCreateRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  roleId: string;
}

export interface UserUpdateRequest extends Partial<UserCreateRequest> {}

export interface LoginRequest {
  email: string;
  password: string;
}
