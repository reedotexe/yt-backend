import asyncHandler from "../utils/asyncHandler.js";
import jwt from "jsonwebtoken";
import ApiError from "../utils/ApiError.js";
import User from "../models/user.model.js";

export const verifyJwt = asyncHandler(async (req, _, next) => {
    try {

        const token = req.cookies?.accessToken || req.headers.authorization?.split(" ")[1]
        if (!token) {
            throw new ApiError(401, "Unauthorized")
        }

        const decodedToken = await jwt.verify(token, process.env.JWT_SECRET);

        const user = User.findById(decodedToken?._id).select('-password -refreshToken');

        if (!user) {
            throw new ApiError(401, "Unauthorized")
        };

        req.user = user;
        next()
    } catch (error) {
        throw new ApiError(401, "Unauthorized")
    }
});
