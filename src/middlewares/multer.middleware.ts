import multer, { StorageEngine } from "multer";
import path from "path";
import { randomUUID } from "crypto";
import { Request } from "express";

const storage: StorageEngine = multer.diskStorage({
    destination: function (
        req: Request,
        file: Express.Multer.File,
        cb: (error: Error | null, destination: string) => void
    ) {
        cb(null, './public/temp');
    },
    filename: function (
        req: Request,
        file: Express.Multer.File,
        cb: (error: Error | null, filename: string) => void
    ) {
        const ext = path.extname(file.originalname);
        const base = path.basename(file.originalname, ext);
        const uniqueName = `${base}-${randomUUID()}${ext}`;
        cb(null, uniqueName);
    }
});

export const upload = multer({ 
    storage,
})