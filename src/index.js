import mongoose from "mongoose";
import connectDB from "./db/index.js";
import { app } from "./app.js";
import dotenv from "dotenv";

dotenv.config(
    { path: ".env" }
);

const PORT = process.env.PORT || 3000;
// console.log(PORT);

connectDB()
.then(() => {
    app.listen(PORT, () => {
        console.log(`Server is running on port ${PORT}`);
    });
})
.catch((error) => {
    console.error("Database connection failed:", error);
});
 