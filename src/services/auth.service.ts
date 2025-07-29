import { ILogger } from "../interfaces/logger.interface.ts";
import { Result } from "@carbonteq/fp";
import { inject, injectable } from "tsyringe";
import { IUserRepository } from "../interfaces/userRepository.interface.ts";
import { TOKENS } from "../token.ts";

@injectable()
export class AuthService {
    constructor(
        @inject(TOKENS.IUserRepository) private readonly repo: IUserRepository,
        @inject(TOKENS.ILogger) private readonly logger : ILogger
    ) {}

    async getUserById(id: string): Promise<Result<any, string>> {

        this.logger.info(`AuthService: Fetching user by ID: ${id}`);

        return Result.Ok(id)
            .flatMap((userId) => {
                this.logger.debug(`AuthService: Looking up user in repo: ${userId}`);
                return this.repo.findById(userId)
            })
            .mapErr((err) => {
                this.logger.error(`AuthService: Failed to find user ID: ${id} - Reason: ${err}`);
                return err;
            })
            .toPromise();
    }
}
