# 🍽️ QR Code-Based Self-Ordering & Inventory Management System

A modern, full-stack restaurant management platform that enables seamless customer ordering through QR codes while providing real-time inventory tracking and staff coordination.

## 📋 Project Overview

This integrated system transforms the restaurant dining experience by combining:
- **Contactless QR Code Ordering**: Customers scan a table QR code to browse and order directly from their phones
- **Real-Time Order Management**: Staff receives orders instantly with Socket.io real-time updates
- **Automated Inventory Tracking**: Menu item availability syncs with ingredient stock levels
- **Admin Dashboard**: Comprehensive menu and inventory management interface
- **Multi-Role Access**: Separate interfaces for customers, staff, and administrators

## 🎯 Key Features

### 👥 For Customers
- **QR Code Scanning**: Scan table-specific QR codes to access the menu
- **Browse Menu**: View menu items with images, prices, and availability status
- **Shopping Cart**: Add/remove items and manage quantities
- **Real-Time Stock**: See which items are currently available
- **Order Confirmation**: Instant confirmation after placing an order

### 👨‍💼 For Staff
- **Order Management Dashboard**: Real-time list of incoming orders
- **Order Status Updates**: Track order preparation and readiness
- **Table Management**: View which tables have active orders
- **Inventory Notifications**: Alerts when items run low or run out

### 🔐 For Administrators
- **Menu Management**: Add, edit, delete menu items
- **Inventory Control**: Track ingredient stock levels and usage
- **QR Code Generation**: Create and print QR codes for each table
- **Analytics & Reports**: View order history and sales data
- **User Management**: Manage staff and admin accounts

## 🏗️ Architecture

### Backend (Node.js/Express with MySQL)
- **REST API** for menu and order operations
- **Socket.io** for real-time order notifications
- **JWT Authentication** for secure access
- **MySQL Database** for persistent data storage
- **QR Code Generation** using qrcode library

### Frontend (Django with Python)
- **Server-Side Rendering** for fast initial page load
- **Responsive UI** built with HTML5, CSS3, and JavaScript
- **Static File Management** (CSS, images, fonts)
- **API Integration** with Express backend via HTTP requests
- **Template Inheritance** for consistent styling across pages

## 🛠️ Tech Stack

### Frontend
- **Framework**: Django 4.2
- **Languages**: Python, HTML5, CSS3, JavaScript
- **Server**: Django Development Server / Gunicorn (production)

### Backend
- **Runtime**: Node.js
- **Framework**: Express.js
- **Real-Time**: Socket.io
- **Authentication**: JWT (JSON Web Tokens)
- **Password Hashing**: bcryptjs

### Database
- **DBMS**: MySQL 8.0
- **Schema**: Normalized relational design
- **Tables**: Users, Tables, MenuItems, Orders, OrderItems, Ingredients, Inventory

### Utilities
- **QR Code**: qrcode library (Python & Node.js)
- **HTTP Client**: requests (Python), axios (JavaScript)

## 📦 Project Structure

```
QR CODE SCANNER AND INVENTORY MANAGEMENT SYSTEM/
├── backend/                      # Node.js/Express API
│   └── server.js                # Main server file
├── database/                     # MySQL database files
│   ├── schema.sql               # Database schema
│   └── seed.sql                 # Sample data
├── frontend/                     # Legacy static files (reference)
│   ├── pages/                   # HTML pages backup
│   └── public/                  # CSS, JS, images
├── menu/                         # Django app
│   ├── templates/menu/          # Django templates
│   ├── views.py                 # View functions
│   ├── urls.py                  # URL routing
│   └── migrations/              # Database migrations
├── restaurant_frontend/          # Django project config
├── manage.py                     # Django management script
├── package.json                  # Node.js dependencies
├── requirements.txt              # Python dependencies
└── README.md                     # This file
```

## 🚀 Installation & Setup

### Prerequisites
- **Node.js** 16+ and npm
- **Python** 3.8+ with pip
- **MySQL** 8.0+

### Step 1: Clone Repository
```bash
git clone https://github.com/maina2994/QR-CODE-SCANNER-AND-INVENTORY-MANAGEMENT-SYSTEM.git
cd "QR CODE SCANNER AND INVENTORY MANAGEMENT SYSTEM"
```

### Step 2: Set Up Database
```bash
# Run schema (creates tables)
mysql -u root -p < database/schema.sql

# Load sample data
mysql -u root -p < database/seed.sql
```

### Step 3: Set Up Backend (Express/Node.js)
```bash
# Install dependencies
npm install

# Update MySQL credentials in backend/server.js if needed
# Default: root user, password 'sa22shasasha.'
```

### Step 4: Set Up Frontend (Django/Python)
```bash
# Create Python virtual environment
python -m venv .venv
.venv\Scripts\activate  # On Windows

# Install Python dependencies
pip install -r requirements.txt

# Run migrations
python manage.py migrate

# Collect static files
python manage.py collectstatic --noinput
```

### Step 5: Start the Application

**Terminal 1 - Start Express API (port 3000)**
```bash
npm start
```

**Terminal 2 - Start Django Frontend (port 8000)**
```bash
python manage.py runserver 8000
```

### Step 6: Access the Application
- **Customer Menu**: http://localhost:8000/
- **QR Code Generator**: http://localhost:8000/qr-generate/
- **Cart**: http://localhost:8000/cart/
- **Admin Dashboard**: http://localhost:8000/admin/
- **Staff Dashboard**: http://localhost:8000/staff/
- **API Docs**: http://localhost:3000/menu

## 📱 Usage Guide

### For Customers
1. Visit http://localhost:8000 (or scan table QR code)
2. Browse the menu with product images and prices
3. Add items to your cart
4. Review cart and adjust quantities
5. Click "Checkout" to place order

### For Administrators
1. Navigate to http://localhost:8000/qr-generate/
2. Enter a table number (1-50)
3. Generate and print the QR code
4. Display at the table for customer scanning
5. Access Admin Dashboard to manage menu and inventory

### For Staff
1. Go to http://localhost:8000/staff/
2. View incoming orders in real-time
3. Update order status as items are prepared
4. Notify customers when orders are ready

## 🔐 Default Credentials

**Admin User:**
- Email: `admin@restaurant.com`
- Password: Check `database/seed.sql`

**Staff User:**
- Email: `staff@restaurant.com`
- Password: Check `database/seed.sql`

## 🌐 API Endpoints (Express Backend)

- `GET /menu` - Fetch all menu items
- `POST /order` - Create new order
- `GET /order/:id` - Get order details
- `POST /login` - User authentication
- `GET /generate-qr/:tableId` - Generate QR code

## 📊 Database Schema

**Users**: Admin and staff accounts with hashed passwords  
**Tables**: Restaurant tables with QR code URLs  
**MenuItems**: Food/drink items with prices and images  
**Orders**: Customer orders with timestamps  
**OrderItems**: Individual items in each order  
**Ingredients**: Available ingredients for recipes  
**Inventory**: Stock levels for each ingredient  

## 🎨 Features Highlights

✅ Responsive Design - Works on desktop, tablet, and mobile  
✅ Real-Time Updates - Orders sync instantly using Socket.io  
✅ Image Management - Menu items display product photos  
✅ QR Code Generation - Table-specific codes for tracking  
✅ Inventory Automation - Stock updates when orders are placed  
✅ Search & Filter - Find menu items easily  
✅ Multi-Language Ready - Extensible for localization  

## 🔍 Environment Variables

Create a `.env` file in the root directory (optional):
```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=sa22shasasha.
DB_NAME=restaurant_db
EXPRESS_PORT=3000
DJANGO_PORT=8000
SECRET_KEY=your-django-secret-key
```

## 📈 Performance & Scalability

- **Backend**: Node.js handles concurrent connections efficiently
- **Frontend**: Django caching for frequently accessed pages
- **Database**: MySQL indexes on frequently queried columns
- **Real-Time**: Socket.io scales with connection pooling
- **Static Files**: CDN-ready with proper caching headers

## 🐛 Troubleshooting

### Port Already in Use
```bash
# Kill process on port 3000 (Express)
taskkill /F /IM node.exe

# Kill process on port 8000 (Django)
taskkill /F /IM python.exe
```

### MySQL Connection Error
- Verify MySQL is running: `Get-Service MySQL80`
- Check credentials in `backend/server.js`
- Ensure database exists: `mysql -u root -p -e "SHOW DATABASES;"`

### Static Files Not Loading
```bash
python manage.py collectstatic --clear --noinput
```

## 🚀 Deployment

### For Production
1. Replace Django development server with Gunicorn
2. Set up Nginx as reverse proxy
3. Configure SSL/TLS certificates
4. Use production MySQL server
5. Set `DEBUG = False` in Django settings
6. Configure allowed hosts and domains

## 📝 License

This project is licensed under the MIT License - see LICENSE file for details.

## 👨‍💻 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📞 Support

For issues, questions, or suggestions, please open an issue on GitHub.

## 🎉 Acknowledgments

- Built with modern web frameworks (Express.js, Django)
- Powered by Socket.io for real-time features
- Database design inspired by industry best practices
- QR code generation using qrcode libraries

---

**Last Updated**: April 2026  
**Status**: Production Ready ✅