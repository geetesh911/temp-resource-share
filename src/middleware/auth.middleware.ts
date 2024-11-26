import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AppError } from './error.middleware';
import { db } from '../db';
import { users } from '../db/schema';
import { eq } from 'drizzle-orm';

interface JwtPayload {
    id: string;
}

declare global {
    // eslint-disable-next-line @typescript-eslint/no-namespace
    namespace Express {
        interface Request {
            user?: typeof users.$inferSelect;
        }
    }
}

export const authMiddleware = async (req: Request, _res: Response, next: NextFunction) => {
    try {
        // Get token from header
        const authHeader = req.headers.authorization;
        if (!authHeader?.startsWith('Bearer ')) {
            throw new AppError(401, 'Not authorized to access this route');
        }

        const token = authHeader.split(' ')[1];

        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET!) as JwtPayload;

        // Get user from token
        const user = await db.query.users.findFirst({
            where: eq(users.id, decoded.id),
        });

        if (!user) {
            throw new AppError(401, 'User not found');
        }

        req.user = user;
        next();
    } catch (error) {
        next(new AppError(401, 'Not authorized to access this route'));
    }
};
