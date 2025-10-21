import express from "express";
import { AppDataSource } from "../ormconfig";
import { Message } from "../entities/Message";
import { User } from "../entities/User";
import { authenticateJWT } from "../middleware/authMiddleware";

const router = express.Router();

// All routes require login
router.use(authenticateJWT);

// Send message
// Send message
router.post("/", async (req: any, res) => {
  const { receiverId, content } = req.body;
  try {
    const userRepo = AppDataSource.getRepository(User);
    const messageRepo = AppDataSource.getRepository(Message);

    const sender = await userRepo.findOneBy({ id: req.user.id });
    const receiver = await userRepo.findOneBy({ id: receiverId });

    if (!sender) return res.status(404).json({ message: "Sender not found" });
    if (!receiver) return res.status(404).json({ message: "Receiver not found" });

    const message = messageRepo.create({
      content,
      sender,
      receiver,
      senderId: sender.id,
      receiverId: receiver.id,  // ✅ Important fix
    });

    await messageRepo.save(message);

    res.json({
      message: "Message sent successfully",
      data: {
        id: message.id,
        content: message.content,
        isRead: message.isRead,
        sender: { id: sender.id, name: sender.name, email: sender.email },
        receiver: { id: receiver.id, name: receiver.name, email: receiver.email },
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error sending message" });
  }
});


// Get all messages for logged-in user
router.get("/", async (req: any, res) => {
  try {
    const messageRepo = AppDataSource.getRepository(Message);
    const messages = await messageRepo.find({
      where: [
        { sender: { id: req.user.id } },
        { receiver: { id: req.user.id } }
      ],
      relations: ["sender", "receiver"],
      order: { createdAt: "DESC" },
    });

    // Map to simplified response
    const formatted = messages.map(msg => ({
      id: msg.id,
      content: msg.content,
      isRead: msg.isRead,
      sender: { id: msg.sender.id, email: msg.sender.email },
      receiver: { id: msg.receiver.id, email: msg.receiver.email },
    }));

    res.json(formatted);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error fetching messages" });
  }
});

// Mark message as read
router.put("/:id/read", authenticateJWT, async (req: any, res) => {
  try {
    const messageRepo = AppDataSource.getRepository(Message);
    const message = await messageRepo.findOneBy({ id: Number(req.params.id) });

    if (!message) return res.status(404).json({ message: "Message not found" });
    if (message.receiverId !== req.user.id)
      return res.status(403).json({ message: "Only receiver can mark as read" });

    message.isRead = true;
    await messageRepo.save(message);

    res.json({ message: "Message marked as read", data: message });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error updating message" });
  }
});



// GET /api/messages/unread-count
router.get("/unread-count", authenticateJWT, async (req: any, res) => {
  try {
    const messageRepo = AppDataSource.getRepository(Message);
    const count = await messageRepo.count({
      where: { receiverId: req.user.id, isRead: false },
    });
    res.json({ unreadCount: count });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error fetching unread count" });
  }
});

// GET /api/messages/read-count
router.get("/read-count", authenticateJWT, async (req: any, res) => {
  try {
    const messageRepo = AppDataSource.getRepository(Message);
    const readCount = await messageRepo.count({
      where: { receiverId: req.user.id, isRead: true }, // <-- use receiverId directly
    });
    res.json({ readCount });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error fetching read count" });
  }
}); 


// GET /api/messages/stats
router.get("/stats", authenticateJWT, async (req: any, res) => {
  try {
    const messageRepo = AppDataSource.getRepository(Message);

    const unreadCount = await messageRepo.count({
      where: { receiver: { id: req.user.id }, isRead: false },
    });

    const readCount = await messageRepo.count({
      where: { receiver: { id: req.user.id }, isRead: true },
    });

    res.json({ readCount, unreadCount });
  } catch (error) {
    res.status(500).json({ message: "Error fetching message stats" });
  }
});



export default router;
