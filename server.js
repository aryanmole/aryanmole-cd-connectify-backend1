import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import mongoose from 'mongoose'
import postRoute from './routes/posts.routes.js'
import userRoute from './routes/user.routes.js'
import { connectRedis } from './config/redis.js'
dotenv.config();

const app=express()

app.use(cors())
app.use(express.json())
app.use(postRoute)
app.use(userRoute)
app.use("/uploads", express.static("uploads"))


const start = async()=>{
    await connectRedis()
    await mongoose.connect(process.env.MONGODB_URI)
    console.log("MongoDB Connected");

    app.listen(8000,()=>[
        console.log("server is running")
        
    ])
}

start()