import { Request, Response, NextFunction } from "express";

type AsyncHandlerFunction = (req: Request, res: Response, next: NextFunction) => Promise<any>;

const asyncHandler = (fn: AsyncHandlerFunction) =>
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            await fn(req, res, next);
        } catch (error: any) {
            res.status(error.code || 500).json({
                success: false,
                message: error.message || "Something went wrong",
                errors: error.error,
            });
        }
    };

export { asyncHandler };
