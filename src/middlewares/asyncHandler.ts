import type { Request, Response, NextFunction } from "express";

const asyncHandler = (fn: (req: Request, res: Response, next: NextFunction) => Promise<void|Response>) => {
    return (req: Request, res: Response, next: NextFunction) => {
        fn(req, res, next).catch((error: Error) => {
            res.status(400).json({
                message: error.message,
                error: true
            });
        });
    };
};

export default asyncHandler;

