import { model, Schema } from "mongoose";

const userSchema = new Schema({
    username: {
        type: String,
        required: true
    },
    name: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true
    },
    password: {
        type: String,
    },
    avatar: {
        type: String,
    },
    isAuthenticated: {
        type: Boolean,
        default: false
    }
}, { timestamps: true })

const User = model("User", userSchema)
export default User

