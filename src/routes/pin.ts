import express from "express"
import pinController from "../controller/pin"
const route = express()

route.get("/", pinController.getAallPins)
route.post("/", pinController.create)
route.get("/:id", pinController.getPin)

export default route