// routes/userRoutes.js
import express from "express";
import { getAllUsers, getUserByUsernameOrEmail, getUserById } from "../routControler/userController.js";

const router = express.Router();

// Route to get all users
router.get("/", getAllUsers);

// Route to get a user by username or email
router.get("/search", getUserByUsernameOrEmail);

// Route to get a user by ID
router.get("/:id", getUserById);

export default router;