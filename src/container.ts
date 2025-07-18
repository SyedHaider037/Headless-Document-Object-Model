import { DocumentRepository } from "./repositories/document.repository";
import { UserRepository } from "./repositories/user.repository";
import { PermissionRepository } from "./repositories/permission.repository";
import { IDocumentRepository } from "./interfaces/documentRepository.interface";
import { IUserRepository } from "./interfaces/userRepository.interface";
import { IPermissionRepository } from "./interfaces/permissionRepository.interface";
import { container } from "tsyringe";
import { TOKENS } from "./token";


container.register<IUserRepository>(TOKENS.IUserRepository,{useClass: UserRepository});
container.register<IDocumentRepository>(TOKENS.IDocumentRepository,{useClass: DocumentRepository});
container.register<IPermissionRepository>(TOKENS.IPermissionRepository,{useClass: PermissionRepository});
