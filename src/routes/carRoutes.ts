import express from "express";
import { AppDataSource } from "../ormconfig";
import { Car } from "../entities/Car";
import { authenticateJWT, authorizeRoles } from "../middleware/authMiddleware";
/**import paths for uploads */
import path from "path";
import fs from "fs";
import { uploadImage } from "../middleware/upload";


const router = express.Router();
const carRepository = AppDataSource.getRepository(Car);

/**
 * POST /api/cars  (owner/admin/sales)
 */
router.post(
  "/",
  authenticateJWT,
  authorizeRoles("owner", "admin", "sales"),
  async (req, res) => {
    try {
      const car = carRepository.create(req.body);
      await carRepository.save(car);
      res.status(201).json(car);
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Error creating car" });
    }
  }
);

/**
 * GET /api/cars  (public)
 */
router.get("/", async (_req, res) => {
  try {
    const cars = await carRepository.find();
    res.json(cars);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error fetching cars" });
  }
});

/**
 * GET /api/cars/search  (public)
 */
router.get("/search", async (req, res) => {
  try {
    const { make, model, minPrice, maxPrice, fuelType, transmission, bodyType, year } = req.query;

    const qb = carRepository.createQueryBuilder("car");

    if (make) qb.andWhere("car.make ILIKE :make", { make: `%${make}%` });
    if (model) qb.andWhere("car.model ILIKE :model", { model: `%${model}%` });
    if (fuelType) qb.andWhere("car.fuelType ILIKE :fuelType", { fuelType: `%${fuelType}%` });
    if (transmission) qb.andWhere("car.transmission ILIKE :transmission", { transmission: `%${transmission}%` });
    if (bodyType) qb.andWhere("car.bodyType ILIKE :bodyType", { bodyType: `%${bodyType}%` });

    const y = Number(year);
    if (!Number.isNaN(y)) qb.andWhere("car.year = :year", { year: y });

    const min = Number(minPrice);
    if (!Number.isNaN(min)) qb.andWhere("car.price >= :minPrice", { minPrice: min });

    const max = Number(maxPrice);
    if (!Number.isNaN(max)) qb.andWhere("car.price <= :maxPrice", { maxPrice: max });

    const cars = await qb.getMany();
    res.json(cars);
  } catch (err) {
    console.error("Search Error:", err);
    res.status(500).json({ message: "Error fetching cars" });
  }
});

/**
 * GET /api/cars/:id  (public)
 */
router.get("/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (Number.isNaN(id)) return res.status(400).json({ message: "Invalid car ID" });
  try {
    const car = await carRepository.findOneBy({ id });
    if (!car) return res.status(404).json({ message: "Car not found" });
    res.json(car);
  } catch (err) {
    console.error("Get Car Error:", err);
    res.status(500).json({ message: "Error fetching car" });
  }
});

/**
 * PUT /api/cars/:id  (owner/admin/sales)
 */
router.put(
  "/:id",
  authenticateJWT,
  authorizeRoles("owner", "admin", "sales"),
  async (req, res) => {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) return res.status(400).json({ message: "Invalid car ID" });

    try {
      const car = await carRepository.findOneBy({ id });
      if (!car) return res.status(404).json({ message: "Car not found" });
      carRepository.merge(car, req.body);
      const saved = await carRepository.save(car);
      res.json(saved);
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Error updating car" });
    }
  }
);

/**
 * DELETE /api/cars/:id  (owner/admin)
 */
router.delete(
  "/:id",
  authenticateJWT,
  authorizeRoles("owner", "admin"),
  async (req, res) => {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) return res.status(400).json({ message: "Invalid car ID" });

    try {
      const result = await carRepository.delete(id);
      if (result.affected === 0) return res.status(404).json({ message: "Car not found" });
      res.json({ message: "Car deleted successfully" });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Error deleting car" });
    }
  }
);

// Upload/replace car image
router.post(
  "/:id/image",
  authenticateJWT,
  authorizeRoles("owner", "admin", "sales"),
  (req, res) => {
    uploadImage(req, res, async (err: any) => {
      if (err) {
        return res.status(400).json({ message: err.message || "Upload error" });
      }

      const id = Number(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid car ID" });

      try {
        const car = await carRepository.findOneBy({ id });
        if (!car) return res.status(404).json({ message: "Car not found" });

        // If replacing an existing image, remove old file
        if (car.imageUrl) {
          const oldPath = path.join(__dirname, "..", "..", car.imageUrl.replace(/^\//, ""));
          fs.existsSync(oldPath) && fs.unlinkSync(oldPath);
        }

        // Multer adds `file` on the request; we only need `.path`.
        const file = (req as any).file as { path: string } | undefined;
        if (!file) return res.status(400).json({ message: "No image provided" });

        // Save relative URL
        car.imageUrl = `/uploads/${path.basename(file.path)}`;
        await carRepository.save(car);

        res.status(200).json({ message: "Image uploaded", imageUrl: car.imageUrl, car });
      } catch (e) {
        console.error(e);
        res.status(500).json({ message: "Error uploading image" });
      }
    });
  }
);

// Delete car image
router.delete(
  "/:id/image",
  authenticateJWT,
  authorizeRoles("owner", "admin"),
  async (req, res) => {
    const id = Number(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid car ID" });

    try {
      const car = await carRepository.findOneBy({ id });
      if (!car) return res.status(404).json({ message: "Car not found" });
      if (!car.imageUrl) return res.status(400).json({ message: "No image to delete" });

      const filePath = path.join(__dirname, "..", "..", car.imageUrl.replace(/^\//, ""));
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

      car.imageUrl = null as any; // or `undefined`; matches your column’s nullable: true
      await carRepository.save(car);

      res.json({ message: "Image removed", car });
    } catch (e) {
      console.error(e);
      res.status(500).json({ message: "Error deleting image" });
    }
  }
);


export default router;
