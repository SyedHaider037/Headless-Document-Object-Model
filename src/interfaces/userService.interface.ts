import { RegisterUserDTO, LoginUserDTO, TokenPayload } from "../dtos/user.dto";

export interface IUserService {
    register(data: RegisterUserDTO): Promise<any>;
    login(data: LoginUserDTO): Promise<{
        user: any;
        role: string;
        accessToken: string;
        refreshToken: string;
    }>;
    logout(userId: string): Promise<void>;
    refreshAccessToken(oldRefreshToken: string): Promise<{
        accessToken: string;
        refreshToken: string;
    }>;
}''