import bcrypt from "bcrypt";
import jwt, {SignOptions} from "jsonwebtoken";

export const hashPassword = async (password: string): Promise<string> => {
    return await bcrypt.hash(password, 10);
}

export const verifyPassword = async (plainPassword: string, hashedPassword: string): Promise<boolean> => {
    return await bcrypt.compare(plainPassword, hashedPassword)
}

export const generateAccessToken = (payload: object): string => {
    const options: SignOptions = {
    expiresIn: (process.env.ACCESS_TOKEN_EXPIRY ?? "1d") as SignOptions["expiresIn"], 
    };
    return jwt.sign(payload, process.env.ACCESS_TOKEN_SECRET!, options);
};

export const generateRefreshToken = (payload: object): string => {
    const options: SignOptions = {
    expiresIn: (process.env.REFRESH_TOKEN_EXPIRY ?? "5d") as SignOptions["expiresIn"], 
    };
    return jwt.sign(payload, process.env.REFRESH_TOKEN_SECRET!, options);
};