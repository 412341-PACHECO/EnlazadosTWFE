export interface RoleCreateRequest {
  name: string;
}

export interface RoleUpdateRequest extends Partial<RoleCreateRequest> {}
