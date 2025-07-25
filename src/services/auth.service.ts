import { Result } from "@carbonteq/fp";
import { inject, injectable } from "tsyringe";
import { IUserRepository } from "../interfaces/userRepository.interface.ts";
import { TOKENS } from "../token.ts";

@injectable()
export class AuthService {
    constructor(
        @inject(TOKENS.IUserRepository) private readonly repo: IUserRepository
    ) {}

    async getUserById(id: string): Promise<Result<any, string>> {
        const result = await this.repo.findById(id);
        if (result.isErr()) return Result.Err(result.unwrapErr());

        const userOpt = result.unwrap();
        if (userOpt.isNone()) return Result.Err("User not found");

        return Result.Ok(userOpt.unwrap());
    }
}
