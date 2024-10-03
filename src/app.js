import express from "express"
import cors from "cors"
import cookieParser from "cookie-parser"

const app = express()


//app.use() is use to set the configurations and the middlewares
app.use(cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true,
}))

app.use(express.json({limit: "16kb"}))
app.use(express.urlencoded({extended: true, limit: "16kb"})) //extended helps us to pass the nested object
app.use(express.static("public"))
app.use(cookieParser())

//routes imports
import userRouter from "./routes/user.routes.js"

//router declaration
app.use("/api/v1/users", userRouter)

export default app