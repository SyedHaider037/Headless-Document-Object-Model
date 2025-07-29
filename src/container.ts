import { DocumentRepository } from "./repositories/document.repository.ts";
import { UserRepository } from "./repositories/user.repository.ts";
import { PermissionRepository } from "./repositories/permission.repository.ts";
import { IDocumentRepository } from "./interfaces/documentRepository.interface.ts";
import { IUserRepository } from "./interfaces/userRepository.interface";
import { IPermissionRepository } from "./interfaces/permissionRepository.interface.ts";
import { ILogger } from "./interfaces/logger.interface.ts";
import { container } from "tsyringe";
import { TOKENS } from "./token";
import { PinoLogger } from "./utils/console.logger.ts";


container.register<IUserRepository>(TOKENS.IUserRepository,{useClass: UserRepository});
container.register<IDocumentRepository>(TOKENS.IDocumentRepository,{useClass: DocumentRepository});
container.register<IPermissionRepository>(TOKENS.IPermissionRepository,{useClass: PermissionRepository});
container.register<ILogger>(TOKENS.ILogger,{useClass : PinoLogger}); 