import * as dotenv from "dotenv";
import mongoose from "mongoose";
dotenv.config()


const connectDB = async (): Promise<void> => {
    try {
        const url = process.env.MONGO_URL;
        if (!url) throw new Error("No MONGO_URL in .env file");
        mongoose.connect(url)
        console.log("DB connection success");
    } catch (error) {
        console.log((error as Error).message);
    }
};

export default connectDB;
