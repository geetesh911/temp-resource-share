import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db } from '../db';
import { users } from '../db/schema';
import { AppError } from '../middleware/error.middleware';
import { eq } from 'drizzle-orm';

export const register = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { name, email, password } = req.body;

        // Check if user exists
        const existingUser = await db.query.users.findFirst({
            where: eq(users.email, email),
        });

        if (existingUser) {
            throw new AppError(400, 'User already exists');
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Create user
        const [user] = await db
            .insert(users)
            .values({
                name,
                email,
                password: hashedPassword,
            })
            .returning();

        // Generate token
        const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET!, {
            expiresIn: process.env.JWT_EXPIRES_IN,
        });

        res.status(201).json({
            status: 'success',
            token,
            data: {
                user: {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                },
            },
        });
    } catch (error) {
        next(error);
    }
};

export const login = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { email, password } = req.body;

        // Check if user exists
        const user = await db.query.users.findFirst({
            where: eq(users.email, email),
        });

        if (!user) {
            throw new AppError(401, 'Invalid credentials');
        }

        // Check password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            throw new AppError(401, 'Invalid credentials');
        }

        // Generate token
        const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET!, {
            expiresIn: process.env.JWT_EXPIRES_IN,
        });

        res.status(200).json({
            status: 'success',
            token,
            data: {
                user: {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                },
            },
        });
    } catch (error) {
        next(error);
    }
};
