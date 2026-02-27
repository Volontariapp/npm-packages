export interface PaginationRequest {
  page?: number;
  limit?: number;
}

export interface PaginationResponse {
  totalItems: number;
  totalPages: number;
  currentPage: number;
  limit: number;
}

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
}

export interface GetUserRequest {
  id: string;
}

export interface GetUserResponse {
  user: User;
}

export interface ListUsersRequest {
  pagination?: PaginationRequest;
}

export interface ListUsersResponse {
  users: User[];
  pagination?: PaginationResponse;
}

export interface CreateUserRequest {
  email: string;
  firstName: string;
  lastName: string;
  password?: string;
  role: string;
}

export interface CreateUserResponse {
  user: User;
}

export interface UpdateUserRequest {
  id: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  role?: string;
}

export interface UpdateUserResponse {
  user: User;
}

export interface DeleteUserRequest {
  id: string;
}

export interface DeleteUserResponse {
  success: boolean;
}
