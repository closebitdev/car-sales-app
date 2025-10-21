import express from "express";
import { AppDataSource } from "../ormconfig";
import { User } from "../entities/User";
import { Car } from "../entities/Car";
import { authenticateJWT, authorizeRoles } from "../middleware/authMiddleware";

const router = express.Router();

// Protect all admin routes
router.use(authenticateJWT, authorizeRoles("owner", "admin"));

// Users
router.get("/users", async (_req, res) => {
  try {
    const users = await AppDataSource.getRepository(User).find();
    res.json(users);
  } catch {
    res.status(500).json({ message: "Error fetching users" });
  }
});

router.put("/users/:id/role", async (req, res) => {
  try {
    const { role } = req.body;
    const repo = AppDataSource.getRepository(User);
    const user = await repo.findOneBy({ id: Number(req.params.id) });
    if (!user) return res.status(404).json({ message: "User not found" });
    user.role = role;
    await repo.save(user);
    res.json({ message: "User role updated", user });
  } catch {
    res.status(500).json({ message: "Error updating user role" });
  }
});

router.delete("/users/:id", async (req, res) => {
  try {
    const result = await AppDataSource.getRepository(User).delete(Number(req.params.id));
    if (result.affected === 0) return res.status(404).json({ message: "User not found" });
    res.json({ message: "User deleted" });
  } catch {
    res.status(500).json({ message: "Error deleting user" });
  }
});

// Cars (admin view)
router.get("/cars", async (_req, res) => {
  try {
    const cars = await AppDataSource.getRepository(Car).find();
    res.json(cars);
  } catch {
    res.status(500).json({ message: "Error fetching cars" });
  }
});

router.get("/cars/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (Number.isNaN(id)) return res.status(400).json({ message: "Invalid car ID" });
  try {
    const car = await AppDataSource.getRepository(Car).findOneBy({ id });
    if (!car) return res.status(404).json({ message: "Car not found" });
    res.json(car);
  } catch (e) {
    console.error("Error fetching car:", e);
    res.status(500).json({ message: "Error fetching car" });
  }
});

export default router;
