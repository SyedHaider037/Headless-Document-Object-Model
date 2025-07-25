import { matchRes } from "@carbonteq/fp";
import { Request, Response } from "express";
import { ApiError } from "../utils/ApiError.ts";
import { ApiResponse } from "../utils/ApiResponse.ts";
import { asyncHandler } from "../utils/asyncHandler.ts";
import { registerSchema, loginSchema } from "../validators/user.validSchema.ts";
import { RequestWithUser } from "../middlewares/auth.middleware.ts";
import { UserService } from "../services/user.service.ts";
import { container } from "tsyringe";

const userService = container.resolve(UserService);

const cookieOptions = {
    httpOnly: true,
    secure: true,
    sameSite: "strict" as const,
    maxAge: 5 * 24 * 60 * 60 * 1000, // 5 days
};

export const registerUser = asyncHandler(async (req: Request, res: Response) => {
    const parsed = registerSchema.safeParse(req.body);

    if (!parsed.success) throw new ApiError(400, "Invalid input", parsed.error.errors);

    const result = await userService.register(parsed.data);

    return matchRes(result, {
        Ok: (user) => 
            res.status(201).json(new ApiResponse(201, { user }, "User created successfully.")),
        Err: (err) => 
            res.status(400).json(new ApiResponse(400, {}, err)),
    });
});

export const loginUser = asyncHandler(async (req: Request, res: Response) => {
    const parsed = loginSchema.safeParse(req.body);

    if (!parsed.success) throw new ApiError(400, "Invalid input", parsed.error.errors);

    const result = await userService.login(parsed.data);

    return matchRes(result, {
        Ok: ({ user, role, accessToken, refreshToken }) =>
            res
                .status(200)
                .cookie("accessToken", accessToken, cookieOptions)
                .cookie("refreshToken", refreshToken, cookieOptions)
                .json(
                    new ApiResponse(
                        200,
                        { user, role, accessToken, refreshToken },
                        "User logged in successfully."
                    )
                ),

        Err: (err) => 
            res.status(401).json(new ApiResponse(401, {}, err)),
    });
});

export const logoutUser = asyncHandler(async (req: RequestWithUser, res: Response) => {
    if (!req.user) throw new ApiError(401, "Unauthorized: user not found");

    const result = await userService.logout(req.user.id);

    return matchRes(result, {
        Ok: () =>
            res
                .status(200)
                .clearCookie("accessToken", cookieOptions)
                .clearCookie("refreshToken", cookieOptions)
                .json(new ApiResponse(200, {}, "User logged out successfully.")),

        Err: (err) =>
            res.status(500).json(new ApiResponse(500, {}, err)),
    });
});

export const refreshAccessToken = asyncHandler(async (req: Request, res: Response) => {
    const incomingToken = req.cookies?.refreshToken || req.body?.refreshToken;

    if (!incomingToken)
        throw new ApiError(401, "Unauthorized request, missing refresh token");

    const result = await userService.refreshAccessToken(incomingToken);

    return matchRes(result, {
        Ok: ({ accessToken, refreshToken }) =>
            res
                .status(200)
                .cookie("accessToken", accessToken, cookieOptions)
                .cookie("refreshToken", refreshToken, cookieOptions)
                .json(
                    new ApiResponse(
                        200,
                        { accessToken, refreshToken },
                        "Access token refreshed"
                    )
                ),

        Err: (err) => 
            res.status(401).json(new ApiResponse(401, {}, err)),
    });
});
