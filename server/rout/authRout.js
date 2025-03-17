import express from "express"
import { LogOut, Login, SignUp } from "../routControler/authControler.js";

const router = express.Router();

router.post('/login',Login)

router.post('/signup',SignUp)

router.post('/logout',LogOut)


export default router