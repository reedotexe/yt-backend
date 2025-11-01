import asyncHandler from "../utils/asyncHandler.js";
import ApiError from "../utils/ApiError.js";
import User from "../models/user.model.js";
import uploadToCloudinary from "../utils/cloudinary.js";
import ApiResponse from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";


const generateAccessAndRefreshTokens = async(userId) => {
    try {
        const user = await User.findById(userId);
        if (!user) {
            throw new ApiError(404, 'User not found');
        }

        const accessToken = user.generateAccessToken();
        const refreshToken = user.generateRefreshToken();

        user.refreshToken = refreshToken;
        await user.save({ validateBeforeSave: false });

        return { accessToken, refreshToken };

    } catch (error) {
        throw new ApiError(500, 'Token generation failed');
    }
}




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

    // console.log(req.files);
    console.log('Files received:', req.files);
    const avatarLocalPath = req.files?.avatar[0].path;
    const coverImageLocalPath = req.files?.coverImage[0].path;

    console.log(avatarLocalPath, coverImageLocalPath);

    if (!avatarLocalPath) {
        throw new ApiError(400, 'Avatar image is required');
    };

    const avatar = await uploadToCloudinary(avatarLocalPath);
    // console.log(avatar);
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


const loginUser = asyncHandler(async (req, res) => {
    // Login logic here
    // console.log("Login request body:", req.body);

    const { email, username, password } = req.body;

    // console.log(req.body);
    // console.log(email, username, password);

    // if (
    //     [email, username, password].some(field => !field || field.trim() === '')
    // ) {
    //     throw new ApiError(400, 'All fields are required');
    // };

    if (!username && !email) {
        throw new ApiError(400, 'Email or Username is required');
    };

    if (!password || password.trim() === '') {
        throw new ApiError(400, 'Password is required');
    };

    const user = await User.findOne({ 
        $or: [{ email }, { username }]
    });

    if (!user) {
        throw new ApiError(401, "User doesn't exist");
    };

    const isPasswordValid = await user.isPasswordCorrerct(password);
    if (!isPasswordValid) {
        throw new ApiError(401, 'Invalid credentials');
    };

    const loggedInUser = await User.findById(user._id).select('-password -refreshToken');

    const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(loggedInUser._id);

    const options = {
        httpOnly: true,
        secure: true,
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    };


    console.log('Login successful, sending response with cookies', loggedInUser);


    return res
    .status(200)
    .cookie('refreshToken', refreshToken, options)
    .cookie('accessToken', accessToken, options)
    .json(new ApiResponse(
        200,
        loggedInUser,
        'User logged in successfully',
    ));
    
});


const logoutUser = asyncHandler(async (req, res) => {
    // Logout logic here

    await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: { refreshToken: undefined }
        },
        {
            new: true,
        }
    );

    const options = {
        httpOnly: true,
        secure: true,
    };

    return res
    .status(200)
    .clearCookie('refreshToken', options)
    .clearCookie('accessToken', options)
    .json(new ApiResponse(
        200,
        null,
        'User logged out successfully',
    ));

});


const refreshAccessToken = asyncHandler(async (req, res) => {
    // Refresh token logic here

    try {
        const { incomingRefreshToken } = req.cookies || req.body.refreshToken;
    
        if (!incomingRefreshToken) {
            throw new ApiError(401, 'Refresh token missing');
        };
    
        const decodedToken = await jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET);
    
        const user = await User.findById(decodedToken.userId);
        if (!user || user.refreshToken !== incomingRefreshToken) {
            throw new ApiError(401, 'Invalid refresh token');
        };
    
        if (incomingRefreshToken !== user.refreshToken) {
            throw new ApiError(401, 'Refresh token mismatch');
        }
    
        const { accessToken, newRefreshToken } = await generateAccessAndRefreshTokens(user._id);
    
        const options = {
            httpOnly: true,
            secure: true,
        };
    
        return res
        .status(200)
        .cookie('refreshToken', newRefreshToken, options)
        .cookie('accessToken', accessToken, options)
        .json(new ApiResponse(
            200,
            null,
            'Access token refreshed successfully',
        ));

        
    } catch (error) {
        console.error('Error refreshing access token:', error);
        throw new ApiError(401, 'Could not refresh access token. Internal error occurred.');
    }


});


const changeCurrentPassword = asyncHandler(async (req, res) => {
    // Change password logic here

    const { currentPassword, newPassword, confirmPassword } = req.body;

    if ( newPassword !== confirmPassword ) {
        throw new ApiError(400, 'New password and confirm password do not match');
    }

    if ( currentPassword === newPassword ) {
        throw new ApiError(400, 'New password must be different from the current password');
    }

    if (
        [currentPassword, newPassword].some(field => !field || field.trim() === '')
    ) {
        throw new ApiError(400, 'Both current and new passwords are required');
    }

    const user = await User.findById(req.user._id);

    const isPasswordValid = await user.isPasswordCorrect(currentPassword);
    if (!isPasswordValid) {
        throw new ApiError(401, 'Current password is incorrect');
    }

    user.password = newPassword;
    await user.save( { validateBeforeSave: true });

    return res.status(200).json(new ApiResponse(
        200,
        null,
        'Password changed successfully',
    ));

});


const getCurrentUser = asyncHandler(async (req, res) => {
    // const user = await User.findById(req.user._id).select('-password -refreshToken');
    // if (!user) {
    //     throw new ApiError(404, 'User not found');
    // }
    return res.status(200).json(new ApiResponse(
        200,
        req.user,
        'Current user retrieved successfully',
    ));
});


const updateCurrentUser = asyncHandler(async (req, res) => {
    // Update current user logic here

    // use User.findByIdAndUpdate to update the user

});


const updateUserAvatar = asyncHandler(async (req, res) => {
    // Update user avatar logic here
    const avatarLocalPath = req.file?.path;
    if (!avatarLocalPath) {
        throw new ApiError(400, 'Avatar image is required.');
    }

    const avatar = await uploadToCloudinary(avatarLocalPath);
    if (!avatar.url) {
        throw new ApiError(500, 'Avatar upload failed.');
    }
    
    const user = await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: {
                avatar: avatar.url
            }
        },
        { new: true }
    ).select('-password');

    return res
    .status(200)
    .json(new ApiResponse(
        200,
        user,
        'Avatar updated successfully',
    ));

});


const updateUserCoverImage = asyncHandler(async (req, res) => {
    // Update user avatar logic here
    const coverImageLocalPath = req.file?.path;
    if (!coverImageLocalPath) {
        throw new ApiError(400, 'Avatar image is required.');
    }

    const avatar = await uploadToCloudinary(coverImageLocalPath);
    if (!avatar.url) {
        throw new ApiError(500, 'Avatar upload failed.');
    }
    
    const user = await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: {
                coverImage: coverImage.url
            }
        },
        { new: true }
    ).select('-password');

    return res
    .status(200)
    .json(new ApiResponse(
        200,
        user,
        'Cover image updated successfully',
    ));

});

export { registerUser, loginUser, logoutUser, refreshAccessToken, changeCurrentPassword, getCurrentUser, updateCurrentUser, updateUserAvatar, updateUserCoverImage };
