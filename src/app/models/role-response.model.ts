import { Role } from './role.model';

export interface RoleResponse extends Role {
  id: string;
  createdAt: string;
  updatedAt: string;
}
