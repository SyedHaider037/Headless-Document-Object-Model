import { inject, injectable } from "tsyringe";
import { IUserRepository } from "../interfaces/userRepository.interface.ts";
import { TOKENS } from "../token.ts";

@injectable()
export class AuthService {
    constructor(
        @inject(TOKENS.IUserRepository) private readonly repo: IUserRepository
    ) {}

    async getUserById(id: string) {
        return this.repo.findById(id);
    }
}
