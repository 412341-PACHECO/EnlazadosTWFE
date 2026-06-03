import { User } from './user.model';

export interface UserResponse extends User {
  id: string;
  createdAt: string;
  updatedAt: string;
}
