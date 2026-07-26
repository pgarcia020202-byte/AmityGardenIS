# StoreTrack Backend - Node.js API with Supabase PostgreSQL

A RESTful Node.js backend API for the StoreTrack inventory management system, using Supabase PostgreSQL as the database.

## Features

- **Authentication**: JWT-based authentication with role-based access control (admin/staff)
- **Categories**: Full CRUD operations for product categories
- **Products**: Complete product management with stock tracking
- **Sales**: Sales transaction processing with automatic stock updates
- **Stock Logs**: Comprehensive stock movement tracking
- **Users**: User management with role-based permissions

## Requirements

- Node.js 18+ or 20+
- npm
- Supabase account (or any PostgreSQL database)

## Installation

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

Copy the `.env.example` file to `.env` and update with your Supabase credentials:

```bash
cp .env.example .env
```

Edit `.env` with your Supabase details:

```env
DB_HOST=your-project.supabase.co
DB_PORT=5432
DB_NAME=postgres
DB_USER=postgres
DB_PASSWORD=your-database-password
JWT_SECRET=your-secret-key-here
PORT=8000
APP_URL=http://localhost:8000
```

### 3. Set Up Database

Run the SQL schema in your Supabase SQL Editor:

```bash
# Copy the contents of database/schema.sql
# Paste it into your Supabase SQL Editor and execute
```

This will create all necessary tables and insert a default admin user:
- **Username**: admin
- **Password**: admin123

⚠️ **Important**: Change the default admin password immediately after first login!

### 4. Start the Server

```bash
npm start
```

For development with auto-reload:

```bash
npm run dev
```

The API will be available at `http://localhost:8000`

## API Endpoints

### Authentication

#### Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "username": "admin",
  "password": "admin123"
}
```

**Response**:
```json
{
  "token": "jwt_token_here",
  "user": {
    "id": "uuid",
    "name": "Admin User",
    "username": "admin",
    "role": "admin"
  }
}
```

#### Register (Admin Only)
```http
POST /api/auth/register
Authorization: Bearer {token}
Content-Type: application/json

{
  "name": "John Doe",
  "username": "johndoe",
  "password": "password123",
  "role": "staff"
}
```

#### Verify Token
```http
GET /api/auth/verify
Authorization: Bearer {token}
```

### Categories

#### Get All Categories
```http
GET /api/categories
Authorization: Bearer {token}
```

#### Create Category (Admin Only)
```http
POST /api/categories
Authorization: Bearer {token}
Content-Type: application/json

{
  "name": "Beverages"
}
```

#### Update Category (Admin Only)
```http
PUT /api/categories/{id}
Authorization: Bearer {token}
Content-Type: application/json

{
  "name": "Cold Beverages"
}
```

#### Delete Category (Admin Only)
```http
DELETE /api/categories/{id}
Authorization: Bearer {token}
```

### Products

#### Get All Products
```http
GET /api/products
Authorization: Bearer {token}
```

#### Create Product (Admin Only)
```http
POST /api/products
Authorization: Bearer {token}
Content-Type: application/json

{
  "name": "Coca-Cola 350ml",
  "category_id": "category_uuid",
  "price": 25.00,
  "current_stock": 100,
  "min_stock": 10,
  "total_sold": 0
}
```

#### Update Product (Admin Only)
```http
PUT /api/products/{id}
Authorization: Bearer {token}
Content-Type: application/json

{
  "name": "Coca-Cola 350ml",
  "category_id": "category_uuid",
  "price": 27.00,
  "current_stock": 95,
  "min_stock": 10,
  "total_sold": 5
}
```

#### Delete Product (Admin Only)
```http
DELETE /api/products/{id}
Authorization: Bearer {token}
```

### Sales

#### Get All Sales
```http
GET /api/sales
Authorization: Bearer {token}
```

#### Create Sale
```http
POST /api/sales
Authorization: Bearer {token}
Content-Type: application/json

{
  "items": [
    {
      "productId": "product_uuid",
      "productName": "Coca-Cola 350ml",
      "qty": 2,
      "unitPrice": 25.00,
      "subtotal": 50.00
    }
  ],
  "total": 50.00
}
```

#### Delete Sale (Admin Only)
```http
DELETE /api/sales/{id}
Authorization: Bearer {token}
```

### Stock Logs

#### Get All Stock Logs
```http
GET /api/stock-logs
Authorization: Bearer {token}
```

#### Create Stock Log (Admin Only)
```http
POST /api/stock-logs
Authorization: Bearer {token}
Content-Type: application/json

{
  "product_id": "product_uuid",
  "type": "Stock In",
  "qty_changed": 50,
  "new_stock": 150,
  "remarks": "Restock"
}
```

### Users

#### Get All Users (Admin Only)
```http
GET /api/users
Authorization: Bearer {token}
```

#### Create User (Admin Only)
```http
POST /api/users
Authorization: Bearer {token}
Content-Type: application/json

{
  "name": "Jane Smith",
  "username": "janesmith",
  "password": "password123",
  "role": "staff"
}
```

#### Update User (Admin Only)
```http
PUT /api/users/{id}
Authorization: Bearer {token}
Content-Type: application/json

{
  "name": "Jane Doe",
  "username": "janedoe",
  "role": "admin",
  "password": "newpassword123"
}
```

#### Delete User (Admin Only)
```http
DELETE /api/users/{id}
Authorization: Bearer {token}
```

## Database Schema

The database consists of the following tables:

- **users**: User accounts with authentication and role information
- **categories**: Product categories
- **products**: Product inventory with stock tracking
- **sales**: Sales transactions
- **sale_items**: Individual items within a sale
- **stock_logs**: History of all stock movements

See `database/schema.sql` for the complete schema definition.

## Security

- Passwords are hashed using bcrypt
- JWT tokens are used for authentication with a 7-day expiration
- Role-based access control (admin/staff)
- SQL injection prevention through parameterized queries
- CORS enabled for cross-origin requests

## Error Handling

The API returns appropriate HTTP status codes:

- `200` - Success
- `201` - Created
- `204` - No Content (successful deletion)
- `400` - Bad Request (invalid input)
- `401` - Unauthorized (missing/invalid token)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `409` - Conflict (duplicate entry)
- `500` - Internal Server Error

Error responses follow this format:
```json
{
  "error": "Error message here"
}
```

## Development

### Project Structure

```
backend/
├── config/
│   └── database.js
├── middleware/
│   └── auth.js
├── routes/
│   ├── auth.js
│   ├── categories.js
│   ├── products.js
│   ├── sales.js
│   ├── stockLogs.js
│   └── users.js
├── database/
│   └── schema.sql
├── node_modules/
├── .env
├── .env.example
├── package.json
├── server.js
└── README.md
```

## License

This project is part of the StoreTrack inventory management system.
