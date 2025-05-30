import express from "express"
import commentsController from "../controller/comment"
const route = express()

route.post("/create", commentsController.create)
route.get("/", commentsController.getAllCommentsByPinId)

export default route