import "reflect-metadata"; // required for TypeORM decorators
import express from "express";
import dotenv from "dotenv";
import { AppDataSource } from "./ormconfig";
import carRoutes from "./routes/carRoutes";
import { User } from "./entities/User";
import authRoutes from "./routes/authRoutes";
import favoriteRoutes from "./routes/favoriteRoutes";
import adminRoutes from "./routes/adminRoutes";
import messageRoutes from "./routes/messageRoutes";
import path from "path";
// ...existing imports & app setup


dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// ✅ Middleware to parse JSON bodies
app.use(express.json());

// ✅ Root route
app.get("/", (_, res) => res.send("API is working 🚀"));

// ✅ Routes
app.use("/api/cars", carRoutes);

// Authentications
app.use("/api/auth", authRoutes);

// Favourites
app.use("/api/favorites", favoriteRoutes);

//Admin dashboard
app.use("/api/admin", adminRoutes);

//Messages Route
app.use("/api/messages", messageRoutes);

// Static serving for uploaded files
app.use("/uploads", express.static(path.join(__dirname, "..", "uploads")));




// ✅ Initialize database and start server
AppDataSource.initialize()
  .then(async () => {
    console.log("Database connected ✅");

    // Optional: create a test user if none exists
    const userRepo = AppDataSource.getRepository(User);
    const existingUser = await userRepo.findOneBy({ email: "admin@carsales.com" });
    if (!existingUser) {
      const testUser = userRepo.create({
        name: "Admin User",
        email: "admin@carsales.com",
        password: "admin123",
        role: "owner",
      });
      await userRepo.save(testUser);
      console.log("Test user created ✅");
    }

    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  })
  .catch((error) => console.error("Database connection error:", error));

export default app;
