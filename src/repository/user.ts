import jwt, { JwtPayload } from "jsonwebtoken"
import User from "../models/user"

export const userRepository = {
    getUserByToken: async (token: string) => {
        if (!token) throw new Error("user tidak terauthentifikasi")
        const { id } = jwt.verify(token, process.env.SECRET_KEY || "") as JwtPayload
        const user = await User.findOne({ _id: id })
        if (!user) {
            throw new Error("User Not Found")
        }

        if (!user.isAuthenticated) throw new Error("User is not verified yet")
        const { _id } = user.toObject()
        return { id: _id.toString(), user: user.toObject() }
    }
}