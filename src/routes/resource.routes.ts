import express from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import { upload } from '../middleware/upload.middleware';
import {
    createResource,
    getResources,
    getResource,
    accessResource,
    deleteResource,
} from '../controllers/resource.controller';

export const resourceRouter = express.Router();

// Protected routes (require authentication)
resourceRouter.post('/', authMiddleware, upload.single('file'), createResource);
resourceRouter.get('/', authMiddleware, getResources);
resourceRouter.get('/:id', authMiddleware, getResource);
resourceRouter.delete('/:id', authMiddleware, deleteResource);

// Public route for accessing shared resources
resourceRouter.get('/access/:accessToken', accessResource);
