# Temp Share API

A secure and efficient temporary resource sharing API built with Node.js, Express, and Drizzle ORM. This API allows users to create temporary shareable resources with automatic expiration.

## Features

- User Authentication (JWT)
- Create temporary shareable resources
- Automatic resource expiration
- Secure access tokens for resources
- Resource status tracking (active/expired)
- Soft delete functionality

## Resource Expiry Logic

The API implements a robust resource expiry system:

1. **Expiration Time**

    - Each resource is created with an `expirationTime`
    - Default expiry is set to 7 days (configurable via `DEFAULT_EXPIRY_DAYS` in `.env`)
    - Custom expiry duration can be set during resource creation

2. **Automatic Expiry Check**

    - A cron job runs periodically to check for expired resources
    - Development: Checks every minute
    - Production: Checks every hour
    - Resources are marked as expired when current time > expiration time

3. **Resource States**

    - Active: Not expired and not deleted
    - Expired: Past expiration time
    - Deleted: Soft deleted (deletedAt is set)

4. **Access Control**
    - Expired resources cannot be accessed via access token
    - Deleted resources are not accessible
    - Resources are only accessible via their unique access token

## Tech Stack

- Node.js & Express
- PostgreSQL
- Drizzle ORM
- TypeScript
- JWT Authentication
- Node-cron for scheduling

## Prerequisites

- Node.js (v14 or higher)
- PostgreSQL
- npm or yarn

## Setup

1. **Clone the repository**

    ```bash
    git clone <repository-url>
    cd temp-share
    ```

2. **Install dependencies**

    ```bash
    npm install
    ```

3. **Environment Setup**

    ```bash
    cp .env.example .env
    ```

    Update the `.env` file with your configuration:

    ```env
    PORT=3000
    NODE_ENV=development

    # Database
    DATABASE_URL=postgres://postgres:password@localhost:5432/temp_share

    # JWT
    JWT_SECRET=your-secret-key
    JWT_EXPIRES_IN=1d

    # App Config
    DEFAULT_EXPIRY_DAYS=7
    ```

4. **Database Setup**

    ```
    NOTE: Make sure to create the database before running the migration
    ```

    ```bash

    # Apply migration
    npm run db:push
    ```

5. **Start the server**

    ```bash
    # Development
    npm run dev

    # Production
    npm run build
    npm start
    ```

## API Documentation

### Authentication

#### Register User

- **Endpoint**: `POST /auth/register`
- **Description**: Register a new user
- **Authentication**: None
- **Request Body**:
    ```json
    {
        "name": "John Doe",
        "email": "john@example.com",
        "password": "password123"
    }
    ```
- **Response**: Returns user data and JWT token
- **Example**:
    ```bash
    curl -X POST http://localhost:3000/auth/register \
      -H "Content-Type: application/json" \
      -d '{
        "name": "John Doe",
        "email": "john@example.com",
        "password": "password123"
      }'
    ```

#### Login

- **Endpoint**: `POST /auth/login`
- **Description**: Authenticate user and get JWT token
- **Authentication**: None
- **Request Body**:
    ```json
    {
        "email": "john@example.com",
        "password": "password123"
    }
    ```
- **Response**: Returns user data and JWT token
- **Example**:
    ```bash
    curl -X POST http://localhost:3000/auth/login \
      -H "Content-Type: application/json" \
      -d '{
        "email": "john@example.com",
        "password": "password123"
      }'
    ```

### Resources

#### Create Resource

- **Endpoint**: `POST /resources`
- **Description**: Create a new shareable resource
- **Authentication**: Required (JWT)
- **Content-Type**: `multipart/form-data`
- **Body**:

    ```yaml
    # For file upload
    file: <file>  # Optional: File to upload
    name: "Resource Name"  # Optional: Defaults to file name or generated name
    expirationTime: "2024-01-01T00:00:00.000Z"  # Optional: ISO date string

    # For URL resource (when no file)
    name: "Resource Name"
    resourceUrl: "https://example.com/resource"
    expirationTime: "2024-01-01T00:00:00.000Z"
    ```

- **Response**:
    ```json
    {
        "message": "Resource created successfully",
        "data": {
            "id": "uuid",
            "name": "Resource Name",
            "resourceUrl": "/uploads/filename.ext",
            "accessToken": "hex-token",
            "accessUrl": "http://localhost:3000/resources/access/hex-token",
            "expirationTime": "2024-01-01T00:00:00.000Z",
            "isExpired": false,
            "fileKey": "filename.ext",
            "fileName": "original.ext",
            "fileSize": "1024",
            "mimeType": "application/pdf"
        }
    }
    ```

#### List Resources

- **Endpoint**: `GET /resources`
- **Description**: Get all resources for authenticated user
- **Authentication**: Required (JWT)
- **Query Parameters**:
    - `status`: Filter by status (`active` or `expired`)
- **Response**: Returns list of resources
- **Example**:

    ```bash
    # Get all resources
    curl -X GET http://localhost:3000/resources \
      -H "Authorization: Bearer YOUR_TOKEN"

    # Get active resources
    curl -X GET http://localhost:3000/resources?status=active \
      -H "Authorization: Bearer YOUR_TOKEN"

    # Get expired resources
    curl -X GET http://localhost:3000/resources?status=expired \
      -H "Authorization: Bearer YOUR_TOKEN"
    ```

#### Get Single Resource

- **Endpoint**: `GET /resources/:id`
- **Description**: Get a specific resource by ID
- **Authentication**: Required (JWT)
- **Response**: Returns resource data
- **Example**:
    ```bash
    curl -X GET http://localhost:3000/resources/RESOURCE_ID \
      -H "Authorization: Bearer YOUR_TOKEN"
    ```

#### Access Resource (Public)

- **Endpoint**: `GET /resources/access/:accessToken`
- **Description**: Access a resource using its access token
- **Authentication**: None
- **Response**:
    - For files: Downloads the file with original filename
    - For URLs: Returns resource data
    ```json
    {
        "status": "success",
        "data": {
            "resource": {
                "name": "Resource Name",
                "resourceUrl": "https://example.com/resource"
            }
        }
    }
    ```

#### Delete Resource

- **Endpoint**: `DELETE /resources/:id`
- **Description**: Soft delete a resource
- **Authentication**: Required (JWT)
- **Response**: Status 204 if successful
- **Example**:
    ```bash
    curl -X DELETE http://localhost:3000/resources/RESOURCE_ID \
      -H "Authorization: Bearer YOUR_TOKEN"
    ```

## Error Responses

The API returns standardized error responses:

```json
{
    "status": "error",
    "message": "Error message description"
}
```

Common error codes:

- `400`: Bad Request (invalid input)
- `401`: Unauthorized (invalid/missing token)
- `404`: Not Found (resource doesn't exist)
- `410`: Gone (resource expired or deleted)
- `413`: Payload Too Large (file size exceeds limit)
- `500`: Internal Server Error

## File Upload Specifications

- **Maximum File Size**: 10MB
- **Storage Location**: `uploads/` directory
- **File Naming**: Unique names generated using timestamp and random suffix
- **Supported Operations**:
    - Upload with custom name
    - Download with original filename
    - Automatic cleanup (planned)
    - Expiration tracking

## Development

### Available Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run lint` - Run ESLint
- `npm run format` - Format code with Prettier
- `npm test` - Run tests
- `npm run db:generate` - Generate database migrations
- `npm run db:push` - Apply database migrations
- `npm run db:drop` - Drop database schema

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

MIT
