import express from "express"
import userController from "../controller/user"
const route = express()

route.post("/register", userController.register)
route.post("/login", userController.login)
route.post("/verify", userController.verifyOtp)
route.post("/logout", userController.logout)
route.get("/get-user/:username", userController.getUserByUsername)
route.get("/current-user", userController.getLoggedInUser)
route.get("/github", userController.loginGithub)
route.get("/github/callback", userController.githubCallback)
route.get("/google", userController.loginGoogle)
route.get("/google/callback", userController.googleCallback)
route.post("/follow/:username", userController.followUser)

export default route