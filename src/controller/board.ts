import asyncHandler from "../middlewares/asyncHandler";
import Board from "../models/board";
import Pin from "../models/pin";

const boardController = {
    create: asyncHandler(async (_, res) => {
        res.status(201).json({ message: "OK", error: false })
    }),
    getBoardsByUserId: asyncHandler(async (req, res) => {
        const { userId } = req.params
        const boards = await Board.find({ user: userId })
        const boardWithPinDetails = await Promise.all(boards.map(async (board) => {
            const pinCount = await Pin.countDocuments({ board: board._id })
            const firstPin = await Pin.findOne({ board: board._id })
            return {
                ...board.toObject(), pinCount, firstPin
            }
        }))
        res.status(200).json({ message: "OK", boards: boardWithPinDetails, error: false })
    })
}

export default boardController