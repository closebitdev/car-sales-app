import express from "express";
import { AppDataSource } from "../ormconfig";
import { Favorite } from "../entities/Favorite";
import { Car } from "../entities/Car";
import { authenticateJWT } from "../middleware/authMiddleware";

const router = express.Router();
const favoriteRepo = AppDataSource.getRepository(Favorite);
const carRepo = AppDataSource.getRepository(Car);

// ADD car to favorites
router.post("/:carId", authenticateJWT, async (req: any, res) => {
  try {
    const car = await carRepo.findOneBy({ id: Number(req.params.carId) });
    if (!car) return res.status(404).json({ message: "Car not found" });

    const favorite = favoriteRepo.create({ user: { id: req.user.id }, car });
    await favoriteRepo.save(favorite);

    res.status(201).json({ message: "Added to favorites" });
  } catch (error) {
    res.status(500).json({ message: "Error adding favorite" });
  }
});

// GET user's favorites
router.get("/", authenticateJWT, async (req: any, res) => {
  try {
    const favorites = await favoriteRepo.find({
      where: { user: { id: req.user.id } },
      relations: ["car"],
    });
    res.json(favorites);
  } catch (error) {
    res.status(500).json({ message: "Error fetching favorites" });
  }
});

// REMOVE from favorites
router.delete("/:carId", authenticateJWT, async (req: any, res) => {
  try {
    const result = await favoriteRepo.delete({
      user: { id: req.user.id },
      car: { id: Number(req.params.carId) },
    });

    if (result.affected === 0) return res.status(404).json({ message: "Not found in favorites" });
    res.json({ message: "Removed from favorites" });
  } catch (error) {
    res.status(500).json({ message: "Error removing favorite" });
  }
});

export default router;
