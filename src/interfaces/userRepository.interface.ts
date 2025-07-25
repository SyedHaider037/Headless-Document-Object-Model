import { Result } from "@carbonteq/fp";
import { RegisterUserDTO } from "../dtos/user.dto.ts";

export interface IUserRepository {
    create(data: RegisterUserDTO): Promise<Result<any, string>>;
    findByEmail(email: string): Promise<Result<any, string>>;
    findById(id: string): Promise<Result<any, string>>;
    findRoleByName(name: string): Promise<Result<any, string>>;
    findRoleByUserId(userId: string): Promise<Result<any, string>>;
    updateRefreshToken(userId: string, token: string | null): Promise<Result<void, string>>;
    assignRole(userId: string, roleId: string): Promise<Result<void, string>>;
}
