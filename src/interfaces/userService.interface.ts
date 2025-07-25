import { User } from "../services/user.service";
import { Result } from "@carbonteq/fp";
import { RegisterUserDTO, LoginUserDTO} from "../dtos/user.dto";

export interface IUserService {
    register(data: RegisterUserDTO): Promise<Result<User, string>>;
    login(data: LoginUserDTO): Promise<Result<{
        user: any;
        role: string;
        accessToken: string;
        refreshToken: string;
    }, string>>;
    logout(userId: string): Promise<Result<void, string>>;
    refreshAccessToken(oldRefreshToken: string): Promise<Result<{
        accessToken: string;
        refreshToken: string;
    },string>>;
}