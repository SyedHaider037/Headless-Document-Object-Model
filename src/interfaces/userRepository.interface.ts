import { RegisterUserDTO } from "../dtos/user.dto.ts";

export interface IUserRepository {
    create(data: RegisterUserDTO): Promise<any>;
    findByEmail(email: string): Promise<any | null>;
    findById(id: string): Promise<any | null>;
    findRoleByName(name: string): Promise<any | null>;
    findRoleByUserId(userId: string): Promise<any | null>;
    updateRefreshToken(userId: string, token: string | null): Promise<void>;
    assignRole(userId: string, roleId: string): Promise<void> ;
}
