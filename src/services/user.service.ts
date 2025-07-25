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
        @inject(TOKENS.IUserRepository) private readonly repo: IUserRepository
    ) {}

    async register(data: RegisterUserDTO): Promise<Result<any, string>> {
        const { username, email, password, role } = data;

        return Result.Ok(email)
            .flatMap(() =>
                this.repo.findByEmail(email).then((existing) =>
                    existing ? Result.Err("User already exists") : Result.Ok(role)
                )
            )
            .flatMap((roleName) =>
                this.repo.findRoleByName(roleName)
            )
            .flatMap(async (roleData) => {
                const hashed = await hashPassword(password);
                return this.repo
                .create({
                    username,
                    email,
                    password: hashed,
                    role,
                })
                .then((userRes) =>
                    userRes.isErr() ? Result.Err(userRes.unwrapErr()) : Result.Ok({ user: userRes.unwrap(), roleData })
                );
            })
            .flatMap(({ user, roleData }) =>
                this.repo.assignRole(user.id, roleData.id) 
            )
            .toPromise();
    }


    async login(data: LoginUserDTO): Promise<Result<any, string>> {
        const { email, password } = data;

        return Result.Ok(email)
            .flatMap(() =>
                this.repo.findByEmail(email)
            )
            .flatMap(async (user) => {
                const match = await verifyPassword(password, user.password);
                return match ? Result.Ok(user) : Result.Err("Incorrect password");
            })
            .flatMap((user) =>
                this.repo.findRoleByUserId(user.id).then((roleRes) =>
                    roleRes.isErr() ? Result.Err(roleRes.unwrapErr()) : Result.Ok({ user, role: roleRes.unwrap() })
                )
            )
            .flatMap(async ({ user, role }) => {
                const tokenPayload: TokenPayload = {
                    id: user.id,
                    username: user.username,
                    email: user.email,
                    role: role.name,
                };
    
                const accessToken = generateAccessToken(tokenPayload);
                const refreshToken = generateRefreshToken({ id: user.id });
    
                return this.repo
                    .updateRefreshToken(user.id, refreshToken)
                    .then((updateRes) =>
                            updateRes.isErr() ? Result.Err(updateRes.unwrapErr()) : Result.Ok({
                            user: {
                                id: user.id,
                                username: user.username,
                                email: user.email,
                                role: role.name,
                            },
                            accessToken,
                            refreshToken,
                        })
                    );
            })
            .toPromise();
    }

    async logout(userId: string): Promise<Result<void, string>> {
        return this.repo.updateRefreshToken(userId, null);
    }

    async refreshAccessToken( oldRefreshToken: string ): Promise<Result<any, string>> {
        try {
            const result = Result.Ok(oldRefreshToken)
                .flatMap((token) => {
                    try {
                        const decoded = jwt.verify(token, process.env.REFRESH_TOKEN_SECRET!) as { id: string };
                        return Result.Ok(decoded);
                    } catch (err : any) {
                        return Result.Err(err?.message || "Invalid refresh token");
                    }
                })
                .flatMap((decoded) => this.repo.findById(decoded.id))
                .flatMap((userOpt) => {
                    if (!userOpt) return Result.Err("User not found");
                    const user = userOpt.unwrap();
                    if (user.refreshToken !== oldRefreshToken) {
                        return Result.Err("Refresh token expired or rotated");
                    }
                    return Result.Ok(user);
                })
                .flatMap((user) =>
                    this.repo.findRoleByUserId(user.id).then((roleOpt) =>
                        roleOpt ? Result.Ok({ user, role: roleOpt.unwrap() }) : Result.Err("No role assigned")
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
                    const update = await this.repo.updateRefreshToken( user.id, newRefreshToken );
                    if (update.isErr()) return Result.Err(update.unwrapErr());

                    return Result.Ok({ accessToken, refreshToken: newRefreshToken,});
                });

            return result;
        } catch {
            return Result.Err("Internal server error");
        }
    }
}
