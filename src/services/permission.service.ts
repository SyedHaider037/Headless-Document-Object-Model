import { ILogger } from "../interfaces/logger.interface.ts";
import { Result } from "@carbonteq/fp";
import { IPermissionRepository } from "../interfaces/permissionRepository.interface.ts";
import { inject, injectable } from "tsyringe";
import { TOKENS } from "../token.ts";
import { IPermissionService } from "../interfaces/permissionService.interface.ts";

@injectable()
export class PermissionService implements IPermissionService {
    constructor(
        @inject(TOKENS.IPermissionRepository) private readonly repo: IPermissionRepository,
        @inject(TOKENS.ILogger) private readonly logger : ILogger
    ) {}

    async canUserChangeDocument( userId: string, role :string, docId: string, action: string, ): Promise<Result<boolean, string>> {
        this.logger.info(`Checking if user ${userId} with role ${role} can perform '${action}' on document ${docId}`);

        return Result.Ok(userId)
            .flatMap((userId) => this.repo.findUserRole(userId))                      // Result<{ roleId: string }, string>
            .flatMap(async (roleData) => {
                const docRes = await this.repo.findDocumentById(docId);                              // Result<Document, string> 
                return docRes.map((document) => {
                    this.logger.debug(`Found document. Uploaded by: ${document.uploadedBy}`);
                    return { roleData, document }
                });                                                                                    ; // Result<{ roleData, document }, string>
            })
            .flatMap(async ({ roleData, document }) => {
                if (document.uploadedBy !== userId && role !== "ADMIN") {       
                    const msg = "User is not allowed to perform this action";
                    this.logger.warn(`Permission denied for user ${userId} on document ${docId}: ${msg}`);
                    return Result.Err(msg);
                }
                this.logger.info(`Checking permission for role ${roleData.roleId} to perform '${action}'`);
                return this.repo.checkRolePermission(roleData.roleId, action); 
            })
            .mapErr((err) => {
                this.logger.error(`Error in permission check for user ${userId} on document ${docId}: ${err}`);
                return err;
            })
            .toPromise();
    }

    async canUserPerformAction(userId: string, action: string): Promise<Result<boolean, string>> {
        this.logger.info(`Checking if user ${userId} can perform action '${action}'`);

        return Result.Ok(userId)
            .flatMap((userId) => {
                this.logger.debug(`Fetching role data for user: ${userId}`);
                return this.repo.findUserRole(userId)
            })
            .flatMap((roleData) => { 
                this.logger.info(`Checking permission for role ${roleData.roleId} to perform '${action}'`);
                return this.repo.checkRolePermission(roleData.roleId, action)
            })
            .mapErr((err) => {
                this.logger.error(`Error during permission check for user ${userId}: ${err}`);
                return err;
            })
            .toPromise()
    }
}
