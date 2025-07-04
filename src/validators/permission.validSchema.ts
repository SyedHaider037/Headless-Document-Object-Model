import { z } from "zod";

export const grantPermissionSchema = z.object({
    userId: z
        .string({
            required_error: "User ID is required",
            invalid_type_error: "User ID must be a string",
        })
        .uuid(
            "User ID must be a valid UUID (e.g., afe0acd8-82a4-4f91-96de-2a2f0ffef5ca)"
        ),
    givenPermissions: z.object({
        canRead: z.boolean().optional().default(true),
        canUpdate: z.boolean().optional().default(false),
        canDelete: z.boolean().optional().default(false),
    }),
});
