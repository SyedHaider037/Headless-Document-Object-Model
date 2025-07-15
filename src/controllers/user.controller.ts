import { Request, Response } from "express";
import { ApiError } from "../utils/ApiError";
import { ApiResponse } from "../utils/ApiResponse";
import { asyncHandler } from "../utils/asyncHandler";
import { registerSchema, loginSchema } from "../validators/user.validSchema.ts";
import { RequestWithUser } from "../middlewares/auth.middleware.ts";
import { UserService } from "../services/user.service";
import { UserRepository } from "../repositories/user.repository.ts";

const userRepository = new UserRepository();
const userService = new UserService(userRepository);

const cookieOptions = {
    httpOnly: true,
    secure: true,
    sameSite: "strict" as const,
    maxAge: 5 * 24 * 60 * 60 * 1000, // 5 days
};


export const registerUser = asyncHandler( async (req: Request, res: Response) => {
    const parsed = registerSchema.safeParse(req.body);

    if (!parsed.success) throw new ApiError(400, "Invalid input", parsed.error.errors);

    const createdUser = await userService.register(parsed.data);

    return res
        .status(201)
        .json(new ApiResponse(201, createdUser, "User created Successfully."))

});



export const loginUser = asyncHandler ( async (req: Request, res: Response) => {
    const parsed = loginSchema.safeParse(req.body);
    console.log(req);

    if (!parsed.success) {
        throw new ApiError(400, "Invalid input.", parsed.error.errors)
    }

    const { user, role, accessToken, refreshToken } = await userService.login(parsed.data);

    return res
        .status(200)
        .cookie("accessToken", accessToken, cookieOptions)
        .cookie("refreshToken", refreshToken, cookieOptions)
        .json(
            new ApiResponse(
                200,
                {
                    user, 
                    role,
                    accessToken,
                    refreshToken,
                },
                "User logged in successfully."
            )
        );
});



export const logoutUser = asyncHandler( async (req: RequestWithUser, res: Response) => {

    if (!req.user) throw new ApiError(401, "Unauthorized: user not found");

    await userService.logout(req.user.id);

    return res
        .status(200)
        .clearCookie("accessToken", cookieOptions)
        .clearCookie("refreshToken", cookieOptions)
        .json(new ApiResponse(200,{},"User Logged Out Successfully."))
});



export const refreshAccessToken = asyncHandler ( async (req: Request, res: Response) => {
    const incomingToken = req.cookies?.refreshToken || req.body?.refreshToken;

    if (!incomingToken) throw new ApiError(401,"Unauthorized Request");

    const { accessToken, refreshToken } = await userService.refreshAccessToken(incomingToken);   

    return res
    .status(200)
    .cookie("accessToken", accessToken, cookieOptions)
    .cookie("refreshToken", refreshToken, cookieOptions)
    .json(
            new ApiResponse(
            200,
            {accessToken, refreshToken},
            "Access token refreshed"
        )
    );
});