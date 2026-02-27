import type {
  GetUserRequest,
  GetUserResponse,
  ListUsersRequest,
  ListUsersResponse,
  CreateUserRequest,
  CreateUserResponse,
  UpdateUserRequest,
  UpdateUserResponse,
  DeleteUserRequest,
  DeleteUserResponse,
} from '../contracts';

export interface IUserService {
  getUser(request: GetUserRequest): Promise<GetUserResponse>;
  listUsers(request: ListUsersRequest): Promise<ListUsersResponse>;
  createUser(request: CreateUserRequest): Promise<CreateUserResponse>;
  updateUser(request: UpdateUserRequest): Promise<UpdateUserResponse>;
  deleteUser(request: DeleteUserRequest): Promise<DeleteUserResponse>;
}
