import cookieParser from "cookie-parser"
import cors from "cors"
import * as dotenv from "dotenv"
import express from "express"
import connectDB from "./config/db"
import boardRoute from "./routes/board"
import commentRoutes from "./routes/comment"
import pinRoutes from "./routes/pin"
import userRoutes from "./routes/user"
dotenv.config()

const PORT = process.env.PORT || 3030
const app = express()
// ? localhost:5173 for dev
// ? localhost:4173 for build
app.use(cors({
    origin: process.env.FRONTEND_URL || ["http://localhost:5173", "http://localhost:4173"],
    credentials: true
}))
app.use(cookieParser())
app.use(express.json())
app.use("/api/users", userRoutes)
app.use("/api/pins", pinRoutes)
app.use("/api/comments", commentRoutes)
app.use("/api/boards", boardRoute)

app.listen(PORT, () => {
    connectDB()
    console.log(`Server up and Running on http://localhost:${PORT}`);
})