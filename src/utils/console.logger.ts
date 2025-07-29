import pino from "pino";
import { ILogger } from "../interfaces/logger.interface.ts";

const pinoInstance = pino({
    transport: {
        target: "pino-pretty", // for development logs
        options: {
            colorize: true,
            translateTime: "SYS:standard",
            ignore: "pid,hostname",
        },
    },
});

export class PinoLogger implements ILogger {
    info(message: string, meta?: any): void {
        console.log(`[INFO]: ${message}`, meta ?? "");
    }

    warn(message: string, meta?: any): void {
        console.warn(`[WARN]: ${message}`, meta ?? "");
    }

    error(message: string, meta?: any): void {
        console.error(`[ERROR]: ${message}`, meta ?? "");
    }

    debug(message: string, meta?: any): void {
        console.debug(`[DEBUG]: ${message}`, meta ?? "");
    }
}
