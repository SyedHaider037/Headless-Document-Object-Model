import { seedRoleAndPermission } from "./seedRolesAndPermission.ts";

seedRoleAndPermission()
    .then((result) => {
        console.log("Success", result);
        process.exit(0);
    })
    .catch((err) => {
        console.error(" Seeding error:", err);
        process.exit(1);
    });
