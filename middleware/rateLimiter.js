import rateLimit from "express-rate-limit";
import { RedisStore } from "rate-limit-redis";
import redisClient from "../config/redis.js"; // Import your existing Redis client

export const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 min
    max: 20,
    skipSuccessfulRequests: true,
    standardHeaders: true,   //This tells Express: "Send the new standard rate-limit headers."
    legacyHeaders: false,   //By writing: legacyHeaders: false you tell Express: "Don't send these old-style headers." So your response only contains the newer standard ones.

    message: {
        success: false,
        message: "Too many login attempts. Please try again after 15 minutes."
    }
});

export const apiLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 100,

    standardHeaders: true,
    legacyHeaders: false,

    message: {
        success: false,
        message: "Too many requests."
    } 
});

export const postLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 10,

    standardHeaders: true,
    legacyHeaders: false,

    message: {
        success: false,
        message: "You are posting too frequently."
    }
});

export const commentLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 20,

    standardHeaders: true,
    legacyHeaders: false,

    message: {
        success: false,
        message: "Too many comments."
    }
});

export const uploadLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 20,

    standardHeaders: true,
    legacyHeaders: false,

    message: {
        success: false,
        message: "Upload limit exceeded."
    }
});