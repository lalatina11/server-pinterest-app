import { model, Schema } from "mongoose";

const boardSchema = new Schema({
    title: {
        type: String,
        required: true
    },
    user: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true
    }
}, { timestamps: true })

const Board = model("Board", boardSchema)
export default Board