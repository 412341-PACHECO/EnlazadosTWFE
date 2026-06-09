import { InstitutionBasic } from './institution-basic.model';
import { UserBasic } from './user-basic.model';

export interface Patient {
  firstName: string;
  lastName: string;
  diagnosis: string;
  parent: UserBasic;
  institution: InstitutionBasic;
}
