import { RoleBasic } from './role-basic.model';

export interface User {
  email: string;
  firstName: string;
  lastName: string;
  fcmToken: string | null;
  isActive: boolean;
  role: RoleBasic;
}
