import asyncHandler from "../middlewares/asyncHandler";
import Comment from "../models/comment";
import { userRepository } from "../repository/user";
import { CommentType } from "../types";

const commentController = {
    create: asyncHandler(async (req, res) => {
        const token = req.cookies.token
        const { pin, description } = req.body as CommentType
        const user = await userRepository.getUserByToken(token)
        if ((pin as unknown as string).trim().length < 1 || user.id.trim().length < 1 || description.trim().length < 1) throw new Error("Please input all fields")
        const newComment = await (await Comment.create({ pin, user: user.id, description })).populate("user", "username avatar name")
        res.status(201).json({ message: "OK", data: newComment, error: false })
    }),
    getAllCommentsByPinId: asyncHandler(async (req, res) => {
        const pinId = req.query.pinId
        const Allcomments = await Comment.find({ pin: pinId }).sort({ createdAt: -1 }).populate("user", "username name avatar").lean()
        if (!Allcomments || Allcomments.length < 0) {
            throw new Error("No comment available")
        }
        res.status(200).json({ message: "OK", data: Allcomments, error: false })
    })
}

export default commentController