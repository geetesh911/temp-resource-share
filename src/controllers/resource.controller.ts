import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../db';
import { resources } from '../db/schema';
import { AppError } from '../middleware/error.middleware';
import { and, eq, isNull, lt, gt } from 'drizzle-orm';
import * as crypto from 'crypto';
import * as path from 'path';
import * as fs from 'fs';

const resourceRepository = db.query.resources;

export const createResource = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { name, expirationTime } = req.body;
        const file = req.file;

        const accessToken = crypto.randomBytes(32).toString('hex');
        const expiryDate = new Date(expirationTime || getDefaultExpiryTime());

        const resource = await db
            .insert(resources)
            .values({
                name: name || (file ? file.originalname : `Untitled_Resource_${uuidv4()}`),
                resourceUrl: file ? `/uploads/${file.filename}` : req.body.resourceUrl,
                accessToken,
                expirationTime: expiryDate,
                ownerId: req.user!.id,
                fileKey: file ? file.filename : null,
                fileName: file ? file.originalname : null,
                fileSize: file ? file.size.toString() : null,
                mimeType: file ? file.mimetype : null,
            })
            .returning();

        res.status(201).json({
            message: 'Resource created successfully',
            data: {
                ...resource[0],
                accessUrl: `${req.protocol}://${req.get('host')}/resources/access/${accessToken}`,
            },
        });
    } catch (error) {
        console.error('Error creating resource:', error);
        next(error);
    }
};

export const getResources = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { status } = req.query;
        const currentDate = new Date();

        let whereClause = and(eq(resources.ownerId, req.user!.id), isNull(resources.deletedAt));

        if (status === 'active') {
            whereClause = and(whereClause, gt(resources.expirationTime, currentDate), eq(resources.isExpired, false));
        } else if (status === 'expired') {
            whereClause = and(whereClause, eq(resources.isExpired, true));
        }

        const foundResources = await resourceRepository.findMany({
            where: whereClause,
            orderBy: resources.createdAt,
        });

        res.status(200).json({
            status: 'success',
            data: {
                resources: foundResources.map((resource) => ({
                    ...resource,
                    accessUrl: `${req.protocol}://${req.get('host')}/resources/access/${resource.accessToken}`,
                })),
            },
        });
    } catch (error) {
        next(error);
    }
};

export const getResource = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const resource = await resourceRepository.findFirst({
            where: and(
                eq(resources.id, req.params.id),
                eq(resources.ownerId, req.user!.id),
                isNull(resources.deletedAt),
            ),
        });

        if (!resource) {
            throw new AppError(404, 'Resource not found');
        }

        res.status(200).json({
            status: 'success',
            data: {
                resource: {
                    ...resource,
                    accessUrl: `${req.protocol}://${req.get('host')}/resources/access/${resource.accessToken}`,
                },
            },
        });
    } catch (error) {
        next(error);
    }
};

export const accessResource = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { accessToken } = req.params;

        const resource = await resourceRepository.findFirst({
            where: and(
                eq(resources.accessToken, accessToken),
                isNull(resources.deletedAt),
                eq(resources.isExpired, false),
                gt(resources.expirationTime, new Date()),
            ),
        });

        if (!resource) {
            throw new AppError(404, 'Resource not found or has expired');
        }

        if (resource.fileKey) {
            const filePath = path.join(process.cwd(), 'uploads', resource.fileKey);
            if (fs.existsSync(filePath)) {
                return res.download(filePath, resource.fileName || resource.fileKey);
            }
            throw new AppError(404, 'File not found');
        }

        res.status(200).json({
            status: 'success',
            data: {
                resource: {
                    name: resource.name,
                    resourceUrl: resource.resourceUrl,
                    expirationTime: resource.expirationTime,
                },
            },
        });
    } catch (error) {
        next(error);
    }
};

export const deleteResource = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const resource = await resourceRepository.findFirst({
            where: and(
                eq(resources.id, req.params.id),
                eq(resources.ownerId, req.user!.id),
                isNull(resources.deletedAt),
            ),
        });

        if (!resource) {
            throw new AppError(404, 'Resource not found');
        }

        await db
            .update(resources)
            .set({
                deletedAt: new Date(),
            })
            .where(eq(resources.id, req.params.id));

        res.status(204).json({
            status: 'success',
            data: null,
        });
    } catch (error) {
        next(error);
    }
};

export const markExpiredResources = async (): Promise<void> => {
    const currentDate = new Date();

    try {
        await db
            .update(resources)
            .set({ isExpired: true })
            .where(
                and(
                    lt(resources.expirationTime, currentDate),
                    eq(resources.isExpired, false),
                    isNull(resources.deletedAt),
                ),
            );
    } catch (error) {
        console.error('Error marking expired resources:', error);
    }
};

function getDefaultExpiryTime(): string {
    return process.env.DEFAULT_EXPIRY_DAYS
        ? new Date(Date.now() + parseInt(process.env.DEFAULT_EXPIRY_DAYS) * 24 * 60 * 60 * 1000).toISOString()
        : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
}
