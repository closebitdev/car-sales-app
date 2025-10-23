import express from "express";
import { AppDataSource } from "../ormconfig";
import { Car } from "../entities/Car";
import { authenticateJWT, authorizeRoles } from "../middleware/authMiddleware";

/**import paths for uploads */
import path from "path";
import fs from "fs";

import { CarImage } from "../entities/CarImage";
import { uploadImages } from "../middleware/upload";


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

// -------------------------------------------
// IMAGES: list, upload, update, delete
// -------------------------------------------

// List images for a car
router.get("/:id/images", async (req, res) => {
  const id = Number(req.params.id);
  if (isNaN(id)) return res.status(400).json({ message: "Invalid car ID" });

  try {
    const imgs = await AppDataSource.getRepository(CarImage).find({
      where: { car: { id } },
      order: { sortOrder: "ASC", id: "ASC" },
    });
    res.json(imgs);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Error fetching images" });
  }
});

// Upload multiple images
router.post(
  "/:id/images",
  authenticateJWT,
  authorizeRoles("owner", "admin", "sales"),
  (req, res) => {
    uploadImages(req, res, async (err: any) => {
      if (err) return res.status(400).json({ message: err.message || "Upload error" });

      const id = Number(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid car ID" });

      try {
        const carRepo = AppDataSource.getRepository(Car);
        const imgRepo = AppDataSource.getRepository(CarImage);

        const car = await carRepo.findOne({ where: { id }, relations: ["images"] });
        if (!car) return res.status(404).json({ message: "Car not found" });

        const files = (req as any).files as Express.Multer.File[] | undefined;
        if (!files?.length) return res.status(400).json({ message: "No images provided" });

        // Determine starting sortOrder
        const maxSort = car.images?.length ? Math.max(...car.images.map((i) => i.sortOrder)) : -1;

        const newImages: CarImage[] = [];
        files.forEach((file, idx) => {
          const img = imgRepo.create({
            car,
            url: `/uploads/${path.basename(file.path)}`,
            isPrimary: false,
            sortOrder: maxSort + 1 + idx,
          });
          newImages.push(img);
        });

        await imgRepo.save(newImages);

        // If no primary image exists, set the first newly uploaded as primary
        const hasPrimary = (car.images || []).some((i) => i.isPrimary);
        if (!hasPrimary && newImages.length) {
          newImages[0].isPrimary = true;
          await imgRepo.save(newImages[0]);
          // sync legacy field
          car.imageUrl = newImages[0].url;
          await carRepo.save(car);
        }

        res.status(201).json({ message: "Images uploaded", images: newImages });
      } catch (e) {
        console.error(e);
        res.status(500).json({ message: "Error uploading images" });
      }
    });
  }
);

// Update image (caption, sortOrder, set primary)
router.patch(
  "/:id/images/:imageId",
  authenticateJWT,
  authorizeRoles("owner", "admin", "sales"),
  async (req, res) => {
    const carId = Number(req.params.id);
    const imageId = Number(req.params.imageId);
    if ([carId, imageId].some(isNaN)) return res.status(400).json({ message: "Invalid IDs" });

    const { caption, sortOrder, isPrimary } = req.body as {
      caption?: string;
      sortOrder?: number;
      isPrimary?: boolean;
    };

    try {
      const carRepo = AppDataSource.getRepository(Car);
      const imgRepo = AppDataSource.getRepository(CarImage);

      const car = await carRepo.findOne({ where: { id: carId }, relations: ["images"] });
      if (!car) return res.status(404).json({ message: "Car not found" });

      const image = await imgRepo.findOne({ where: { id: imageId, car: { id: carId } } });
      if (!image) return res.status(404).json({ message: "Image not found" });

      if (caption !== undefined) image.caption = caption;
      if (typeof sortOrder === "number") image.sortOrder = sortOrder;

      if (isPrimary === true) {
        // clear previous primary
        const all = await imgRepo.find({ where: { car: { id: carId } } });
        for (const i of all) {
          if (i.isPrimary) {
            i.isPrimary = false;
            await imgRepo.save(i);
          }
        }
        image.isPrimary = true;
        // sync legacy car.imageUrl
        car.imageUrl = image.url;
        await carRepo.save(car);
      } else if (isPrimary === false && image.isPrimary) {
        // prevent leaving car without a primary via this call—ignore false if it's the only primary
        // (client can set another as primary first)
      }

      await imgRepo.save(image);
      res.json({ message: "Image updated", image });
    } catch (e) {
      console.error(e);
      res.status(500).json({ message: "Error updating image" });
    }
  }
);

// Delete image
router.delete(
  "/:id/images/:imageId",
  authenticateJWT,
  authorizeRoles("owner", "admin"),
  async (req, res) => {
    const carId = Number(req.params.id);
    const imageId = Number(req.params.imageId);
    if ([carId, imageId].some(isNaN)) return res.status(400).json({ message: "Invalid IDs" });

    try {
      const carRepo = AppDataSource.getRepository(Car);
      const imgRepo = AppDataSource.getRepository(CarImage);

      const car = await carRepo.findOne({ where: { id: carId }, relations: ["images"] });
      if (!car) return res.status(404).json({ message: "Car not found" });

      const image = await imgRepo.findOne({ where: { id: imageId, car: { id: carId } } });
      if (!image) return res.status(404).json({ message: "Image not found" });

      // Remove file from disk
      const filePath = path.join(__dirname, "..", "..", image.url.replace(/^\//, ""));
      if (fs.existsSync(filePath)) {
        try {
          fs.unlinkSync(filePath);
        } catch (e) {
          console.warn("Failed to unlink file:", filePath, e);
        }
      }

      const isPrimary = image.isPrimary;
      await imgRepo.remove(image);

      // If we deleted the primary, set a new one & sync legacy field
      if (isPrimary) {
        const remaining = await imgRepo.find({
          where: { car: { id: carId } },
          order: { sortOrder: "ASC", id: "ASC" },
        });
        if (remaining.length) {
          remaining[0].isPrimary = true;
          await imgRepo.save(remaining[0]);
          car.imageUrl = remaining[0].url;
        } else {
          car.imageUrl = null as any;
        }
        await carRepo.save(car);
      }

      res.json({ message: "Image deleted" });
    } catch (e) {
      console.error(e);
      res.status(500).json({ message: "Error deleting image" });
    }
  }
);



export default router;
