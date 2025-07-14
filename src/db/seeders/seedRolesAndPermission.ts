import { db } from "../index.ts";
import { globalPermissions } from "../../schemas/globalPermission.schema.ts";
import { roles } from "../../schemas/roles.schema.ts";
import { rolePermission } from "../../schemas/rolesPermission.schema.ts";
import { eq } from "drizzle-orm";

const roleData = [
    {name: "ADMIN"},
    {name: "USER"},
];

const permissionData = [
    {action: "CREATE_DOCUMENT", description: "Can upload the document"},
    {action: "READ_DOCUMENT", description: "Can view the document"},
    {action: "UPDATE_DOCUMENT", description: "Can update the document"},
    {action: "DELETE_DOCUMENT", description: "Can delete the document"},
    {action: "MANAGE_PERMISSIONS", description: "Can update/delete any document"},
];

const rolePermissionMap : Record<string, string[]> = {
    ADMIN: [
        "CREATE_DOCUMENT",
        "READ_DOCUMENT",
        "UPDATE_DOCUMENT",
        "DELETE_DOCUMENT",
        "MANAGE_PERMISSIONS",
    ],
    USER: [
        "CREATE_DOCUMENT",
        "READ_DOCUMENT",
        "UPDATE_DOCUMENT",
        "DELETE_DOCUMENT",
    ]
}; 

export const seedRoleAndPermission = async () => {
    // await db.delete(rolePermission);
    // await db.delete(roles);
    // await db.delete(globalPermissions);
    const insertedRoles = await Promise.all(
        roleData.map(async (role) => {
            const [existing] = await db.select().from(roles).where(eq(roles.name, role.name));
            if (existing) return existing;
            const [inserted] = await db.insert(roles).values(role).returning();
            return inserted;
        })
    );    

    console.log("Roles seeded:", insertedRoles);

    const insertedPermissions = await Promise.all(
        permissionData.map(async (perm) => {
            const [existing] = await db.select().from(globalPermissions).where(eq(globalPermissions.action, perm.action));
            if (existing) return existing;
            const [inserted] = await db.insert(globalPermissions).values(perm).returning();
            return inserted;
        })
    );

    console.log("Permission seeded:", insertedPermissions);

    for (const role of insertedRoles) {
        const allowedActions = rolePermissionMap[role.name as keyof typeof rolePermissionMap] || [];

        for (const action of allowedActions) {
            const permission = insertedPermissions.find((p) => p.action === action);
            if (!permission) continue;

            await db.insert(rolePermission).values({
                roleId: role.id,
                permissionId: permission.id,
            }).onConflictDoNothing();
        }
    }
    console.log("Roles and Permissions seeded successfully");
}