import { IUserService } from "../interfaces/userService.interface";
import { IUserRepository } from "../interfaces/userRepository.interface";
import { RegisterUserDTO, LoginUserDTO, TokenPayload } from "../dtos/user.dto";
import jwt from "jsonwebtoken";
import { hashPassword, verifyPassword, generateAccessToken, generateRefreshToken } from "../lib/jwt&bcryptAuth";
import { ApiError } from "../utils/ApiError";

export class UserService implements IUserService {
    constructor(private readonly repo: IUserRepository) {}
    async register(data: RegisterUserDTO): Promise<any> {
        const { username, email, password, role } = data;

        const existing = await this.repo.findByEmail(email);
        if (existing) throw new ApiError(400, "User already exists");

        const roleRow = await this.repo.findRoleByName(role);

        if (!roleRow) throw new ApiError(400, "Invalid role provided");

        const hashedPassword = await hashPassword(password);

        const [createdUser] =  await this.repo.create({
            username,
            email,
            password: hashedPassword,
            role,
        });

        await this.repo.assignRole(createdUser.id, roleRow.id);
        return createdUser;
    }

    async login(data: LoginUserDTO) {
        const { email, password } = data;

        const user = await this.repo.findByEmail(email);
        if (!user) throw new ApiError(404, "User not found");

        const passwordMatch = await verifyPassword(password, user.password);
        if (!passwordMatch) throw new ApiError(401, "Incorrect password");

        const roleRow = await this.repo.findRoleByUserId(user.id);
        if (!roleRow) throw new ApiError(403, "Role not assigned");

        const tokenPayload: TokenPayload = {
            id: user.id,
            username: user.username,
            email: user.email,
            role: roleRow.name,
        };

        const accessToken = generateAccessToken(tokenPayload);
        const refreshToken = generateRefreshToken({ id: user.id });

        await this.repo.updateRefreshToken(user.id, refreshToken);

        const { password: _, refreshToken: __, ...userSafe } = user;
        return { user: userSafe, role: roleRow.name, accessToken, refreshToken };
    }

    async logout(userId: string): Promise<void> {
        await this.repo.updateRefreshToken(userId, null);
    }

    async refreshAccessToken(oldRefreshToken: string) {
        let decoded;
        try {
            decoded = jwt.verify(oldRefreshToken, process.env.REFRESH_TOKEN_SECRET!) as { id: string };
    
        } catch (error: any) {
            throw new ApiError(401, error?.message || "Invalid refresh token");
        }

        const user = await this.repo.findById(decoded.id);
        if (!user) throw new ApiError(401, "User not found");

        if (user.refreshToken !== oldRefreshToken) {
            throw new ApiError(403, "Refresh token expired or rotated");
        }

        const roleRow = await this.repo.findRoleByUserId(user.id);
        if (!roleRow) throw new ApiError(403, "No role assigned");

        const accessToken = generateAccessToken({
            id: user.id,
            username: user.username,
            email: user.email,
            role: roleRow.name,
        });

        const newRefreshToken = generateRefreshToken({ id: user.id });
        await this.repo.updateRefreshToken(user.id, newRefreshToken);

        return { accessToken, refreshToken: newRefreshToken };
    }
}
