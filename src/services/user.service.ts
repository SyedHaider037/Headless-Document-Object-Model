import { ILogger } from "../interfaces/logger.interface.ts";
import { Result } from "@carbonteq/fp";
import { IUserService } from "../interfaces/userService.interface.ts";
import { IUserRepository } from "../interfaces/userRepository.interface.ts";
import { RegisterUserDTO, LoginUserDTO, TokenPayload } from "../dtos/user.dto.ts";
import jwt from "jsonwebtoken";
import { hashPassword, verifyPassword, generateAccessToken, generateRefreshToken } from "../lib/jwt&bcryptAuth.ts";
import { inject, injectable } from "tsyringe";
import { TOKENS } from "../token.ts";

export interface User {
    id: string;
    username: string;
    email: string;
    password: string;
    refreshToken: string;
}  

@injectable()
export class UserService implements IUserService {
    constructor(
        @inject(TOKENS.IUserRepository) private readonly repo: IUserRepository,
        @inject(TOKENS.ILogger) private readonly logger : ILogger
    ) {}

    async register(data: RegisterUserDTO): Promise<Result<any, string>> {
        const { username, email, password, role } = data;

        this.logger.info(`Registering new user with email: ${email}`);

        return Result.Ok(email)
            .flatMap(async (email) => {
                this.logger.debug(`Checking if email exists: ${email}`);
                const emailCheck = await this.repo.findByEmail(email);
                    return emailCheck.isOk() 
                        ? Result.Err("User already exists")
                        : Result.Ok(role);
            })
            .flatMap((role) => {
                this.logger.debug(`Finding role by name: ${role}`);
                return this.repo.findRoleByName(role);
            })
            .flatMap(async (roleData) => {
                const hashed = await hashPassword(password);
                this.logger.debug(`Password hashed for user: ${email}`);
                return this.repo.create({
                    username,
                    email,
                    password: hashed,
                    role,
                }).then((user) => {
                    this.logger.info(`User created: ${email}`);
                    return user.map((user) => ({ user, roleData }));
                });
            })
            .flatMap(({ user, roleData }) => {
                this.logger.debug(`Assigning role to user ID: ${user.id}`);
                return this.repo.assignRole(user.id, roleData.id);
            })
            .mapErr((err) => {
                this.logger.error(`User registration failed: ${err}`);
                return err;
            })
            .toPromise();

    }


    async login(data: LoginUserDTO): Promise<Result<any, string>> {
        const { email, password } = data;

        this.logger.info(`Login attempt for email: ${email}`);

        return Result.Ok(email)
            .flatMap((email) =>
                this.repo.findByEmail(email)
            )
            .flatMap(async (user) => {
                const match = await verifyPassword(password, user.password);
                if (!match) {
                    this.logger.warn(`Incorrect password for user: ${email}`);
                    return Result.Err("Incorrect password");
                }
                this.logger.info(`Password verified for user: ${email}`);
                return Result.Ok(user);
            })
            .flatMap((user) => {
                this.logger.debug(`Fetching role for user ID: ${user.id}`);
                return this.repo.findRoleByUserId(user.id)
                    .then((roleRes) => roleRes.map((roleRes) => ({user, role: roleRes}))
                )
            })
            .flatMap(async ({ user, role }) => {
                const tokenPayload: TokenPayload = {
                    id: user.id,
                    username: user.username,
                    email: user.email,
                    role: role.name,
                };
    
                const accessToken = generateAccessToken(tokenPayload);
                const refreshToken = generateRefreshToken({ id: user.id });

                this.logger.info(`Tokens generated for user: ${email}`);
    
                return this.repo
                    .updateRefreshToken(user.id, refreshToken)
                    .then((updateRes) =>
                        updateRes.map(() => ({
                            user: {
                                id: user.id,
                                username: user.username,
                                email: user.email,
                                role: role.name,
                            },
                        accessToken,
                        refreshToken,
                        }))
                    );
            })
            .mapErr((err) => {
                this.logger.error(`Login failed for user: ${email} - Reason: ${err}`);
                return err;
            })
            .toPromise();
    }


    async logout(userId: string): Promise<Result<void, string>> {

        this.logger.info(`Logout requested for user ID: ${userId}`);

        return Result.Ok(userId)
            .flatMap((id) => this.repo.updateRefreshToken(id, null))
            .mapErr((err) => {
                this.logger.error(`Logout failed for user: ${userId} - Reason: ${err}`);
                return err;
            })

            .toPromise();
    }


    async refreshAccessToken( oldRefreshToken: string ): Promise<Result<any, string>> {

        this.logger.info("Refreshing access token");

        return Result.Ok(oldRefreshToken)
            .flatMap((token) => {
                try {
                    const decoded = jwt.verify(token, process.env.REFRESH_TOKEN_SECRET!) as { id: string };
                    this.logger.debug(`Refresh token verified for user ID: ${decoded.id}`);
                    return Result.Ok(decoded);
                } catch (err : any) {
                    this.logger.warn(`Invalid refresh token: ${err?.message}`);
                    return Result.Err(err?.message || "Invalid refresh token");
                }
            })
            .flatMap((decoded) => this.repo.findById(decoded.id))
            .flatMap((user) => {
                if (user.refreshToken !== oldRefreshToken) {
                    this.logger.warn(`Refresh token mismatch for user ID: ${user.id}`);
                    return Result.Err("Refresh token expired or rotated");
                }
                return Result.Ok(user);
            })
            .flatMap((user) =>
                this.repo.findRoleByUserId(user.id)
                    .then((roleOpt) => roleOpt.map((roleOpt) => ({user, role: roleOpt }))
                )
            )
            .flatMap(async ({ user, role }) => {
                const accessToken = generateAccessToken({
                    id: user.id,
                    username: user.username,
                    email: user.email,
                    role: role.name,
                });
                const newRefreshToken = generateRefreshToken({ id: user.id });

                this.logger.info(`New tokens generated for user ID: ${user.id}`);

                return this.repo
                    .updateRefreshToken( user.id, newRefreshToken )
                    .then((updateRes) => updateRes.map(() => ({
                            accessToken,
                            refreshToken: newRefreshToken,
                        })
                    ));
            })
            .mapErr((err) => {
                this.logger.error(`Refresh token process failed - Reason: ${err}`);
                return err;
            })
            .toPromise();
    }
}
