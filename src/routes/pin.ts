import express from "express"
import pinController from "../controller/pin"
const route = express()

route.post("/create", pinController.create)
route.get("/", pinController.getAallPins)
route.get("/:id", pinController.getPin)

export default route