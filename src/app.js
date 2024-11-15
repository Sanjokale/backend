import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

const app = express();
//internally express use http module
//const myServer = http.createServer(app) //here app is the request handler

//app.use() is use to set the configurations and the middlewares
//middleware helps to changes to the request and the response objects
//middleware can end the request-response cycle
//middleware call the next middleware function in the stack

app.use(
  cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true,
  })
);

app.use(express.json({ limit: "16kb" }));
app.use(express.urlencoded({ extended: true, limit: "16kb" })); //extended helps us to pass the nested object
app.use(express.static("public"));
app.use(cookieParser());

//routes imports
import userRouter from "./routes/user.routes.js";

//router declaration
app.use("/api/v1/users", userRouter);

export default app;
