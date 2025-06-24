import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

export const hashPassword = async (password: string): Promise<string> => {
    return await bcrypt.hash(password, 10);
}

export const verifyPassword = async (plainPassword: string, hashedPassword: string): Promise<boolean> => {
    return await bcrypt.compare(plainPassword, hashedPassword)
}

export const generateAccessToken = (payload: object): string => {
    return jwt.sign(payload, process.env.ACCESS_TOKEN_SECRET!, {
    expiresIn: process.env.ACCESS_TOKEN_EXPIRY ? parseInt(process.env.ACCESS_TOKEN_EXPIRY) : "1d",
    });
};

export const generateRefreshToken = (payload: object): string => {
    return jwt.sign(payload, process.env.REFRESH_TOKEN_SECRET!, {
    expiresIn: process.env.REFRESH_TOKEN_EXPIRY ? parseInt(process.env.REFRESH_TOKEN_EXPIRY) : "5d",
    });
};