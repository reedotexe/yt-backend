import asyncHandler from "../utils/asyncHandler.js";
import ApiError from "../utils/ApiError.js";
import User from "../models/user.model.js";
import uploadToCloudinary from "../utils/cloudinary.js";
import ApiResponse from "../utils/ApiResponse.js";

const registerUser = asyncHandler(async (req, res) => {
    // Registration logic here
    
    const { username, email, fullName, password } = req.body
    // console.log(`Registering user: ${username}, ${email}, ${fullName}`);

    // if (!username || !email || !fullName || !password) {
    //     return res.status(400).json({ message: 'All fields are required' });
    // }

    if (
        [fullName, username, email, password].some(field => !field || field.trim() === '')
    ) {
        throw new ApiError(400, 'All fields are required');
    };

    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) {
        throw new ApiError(409, 'User with given email or username already exists');
    };

    console.log(req.files);

    const avatarLocalPath = req.files?.avatar[0].path;
    const coverImageLocalPath = req.files?.coverImage[0].path;

    console.log(avatarLocalPath, coverImageLocalPath);

    if (!avatarLocalPath) {
        throw new ApiError(400, 'Avatar image is required');
    };

    const avatar = await uploadToCloudinary(avatarLocalPath);
    console.log(avatar);
    const coverImage = coverImageLocalPath 
    ? await uploadToCloudinary(coverImageLocalPath) 
    : null;
    console.log(coverImage)

    if (!avatar) {
        throw new ApiError(500, 'Avatar upload failed');
    };

    const user = await User.create({
        fullName,
        username,
        email,
        password,
        avatar: avatar.url,
        coverImage: coverImage?.url || ''
    })

    const createdUser = await User.findById(user._id).select('-password -refreshToken');

    if (!createdUser) {
        throw new ApiError(500, 'User creation failed');
    };

    return res.status(201).json(new ApiResponse(
        201,
        createdUser,
        'User registered successfully',
    ));

});

export { registerUser };
