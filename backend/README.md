MODERNA Backend

This is a minimal Express backend that serves the frontend and exposes a small API:

- GET /api/products  -> list of products (data/data/products.json)
- POST /api/cart     -> add product to in-memory cart, accepts { productId, quantity }
- GET /api/cart      -> return current cart

Run:

```bash
cd backend
npm install
npm run dev   # or npm start
```

The server serves the frontend folder at the site root, so open http://localhost:3000

Seed/Connect to your MongoDB
--------------------------------
1. Create `backend/.env` (copy from `.env.sample`) and set `MONGO_URI` to your Clothing Store MongoDB connection string.

2. (Optional) set admin credentials in env or use defaults:
```

ADMIN_EMAIL=admin@moderna.test
ADMIN_PASSWORD=adminpass
```

3. Install deps and run the seed script to create an admin and sample products:
```bash
cd backend
npm install
node seed.js
```

4. Start the server and log in at `http://localhost:3000/login.html` with the admin account.
