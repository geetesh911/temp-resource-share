import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { resourceRouter } from './routes/resource.routes';
import { authRouter } from './routes/auth.routes';
import { setupExpiryJob } from './jobs/expiry.job';
import { errorHandler } from './middleware/error.middleware';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/auth', authRouter);
app.use('/resources', resourceRouter);

// Error handling
app.use(errorHandler);

const startServer = async () => {
    try {
        // Setup expiry job
        setupExpiryJob();

        // Start server
        app.listen(port, () => {
            console.log(`Server is running on port ${port}`);
        });
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
};

startServer();
