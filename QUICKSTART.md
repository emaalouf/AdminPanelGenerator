# Quick Start Guide

Get your admin panel up and running in 5 minutes!

## Prerequisites

- Node.js 16+ installed
- A MySQL or MS SQL Server database with at least one table

## Installation (One-time)

```bash
# Install all dependencies at once
cd developer-panel/backend && npm install
cd ../frontend && npm install
cd ../../generated/backend && npm install
cd ../frontend && npm install
cd ../..
```

## Running the Developer Panel

Open two terminal windows:

**Terminal 1 - Backend:**
```bash
cd developer-panel/backend
npm start
```

**Terminal 2 - Frontend:**
```bash
cd developer-panel/frontend
npm run dev
```

Then open: http://localhost:5000

## Generate Your First Admin Panel

1. **Connect to database:**
   - Type: MySQL
   - Host: localhost
   - Port: 3306
   - Username: your_username
   - Password: your_password
   - Database: your_database

2. **Select a table** from the list

3. **Configure fields** using the checkboxes

4. **Set authentication** (or choose "None" for testing)

5. Click **"Generate Admin Panel"**

## Run Your Generated Admin Panel

Open two more terminal windows:

**Terminal 3 - Generated Backend:**
```bash
cd generated/backend
npm start
```

**Terminal 4 - Generated Frontend:**
```bash
cd generated/frontend
npm run dev
```

Then open: http://localhost:8080

## That's it! 🎉

You now have a fully functional admin panel with:
- List view with filtering and search
- Create/Edit/Delete operations
- CSV export
- Authentication (if configured)

## Next Steps

- Configure more tables
- Customize the generated code
- Add custom business logic
- Deploy to production

See the [full README](README.md) for detailed documentation.
