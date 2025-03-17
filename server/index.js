import path from "path"
import express from "express";
import dotenv from 'dotenv'
import cors from 'cors'
import cookieparser from "cookie-parser"
import authRout from './rout/authRout.js'
import dbConnection from "./db/dbConnect.js";

const app = express();

const PORT = process.env.PORT || 3000;

dotenv.config();

// Configure CORS for production
const allowedOrigins = [
    'http://localhost:5173', //Optional: Include your local development URL
  ];
  
  app.use(cors({
    origin: function (origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
  }));

app.use(express.json());
app.use(cookieparser());

app.use('/api/auth',authRout)

const POST = process.env.PORT || 3000; 

app.listen(POST,async()=>{
    await dbConnection(),
    console.log(`Server is Running at ${PORT}`);
})