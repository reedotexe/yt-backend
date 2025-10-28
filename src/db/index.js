import mongoose from "mongoose";
import { DB_NAME } from "../constants.js";


// const MONGO_URI = process.env.MONGO_URI;

const connectDB = async () => {
    try {
        const connectionInstance = await mongoose.connect(`${process.env.MONGO_URI}/${DB_NAME}`);
        console.log(`MongoDB connected: ${connectionInstance.connection.host}`);
    } catch (error) {
        console.error("MongoDB connection error:", error);
        process.exit(1);
    }

    // console.log("MONGO_URI:", process.env.MONGO_URI);
};



export default connectDB;
