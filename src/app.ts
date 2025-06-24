import express from "express"
import helmet from "helmet"
import cors from "cors"
import cookieParser from "cookie-parser"

const app = express() 

app.use(helmet())

app.use(cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true, 
}))

app.use(express.json({limit: "50kb"}));

app.use(express.urlencoded({
    extended: true,
    limit: "50kb"
}))

app.use(express.static("public"))

app.use(cookieParser())

app.get('/', (req, res) => {
    res.send('Hello World')
})


import userRouter from "./routes/user.router.ts";

app.use("/api/v1/users", userRouter);

export { app }