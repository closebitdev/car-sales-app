import "reflect-metadata";
import dotenv from "dotenv";
import { AppDataSource } from "./ormconfig";
import app from "./app";
import { User } from "./entities/User";

dotenv.config();

const PORT = process.env.PORT || 3000;

AppDataSource.initialize()
  .then(async () => {
    console.log("Database connected ✅");

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
      console.log("Test user created");
    } else {
      console.log("Test user already exists ✅");
    }

    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  })
  .catch((error) => console.error("Database connection error:", error));
