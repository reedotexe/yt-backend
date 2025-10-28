import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs';

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

console.log("cloudinary api", process.env.CLOUDINARY_API_KEY);

const uploadToCloudinary = async (localFilePath) => {
    try {
        if (!localFilePath) {
            throw new Error('No file path provided for upload.');
            return null;
        }

        const response = await cloudinary.uploader.upload(localFilePath, {
            resource_type: 'auto'
        });

        // Delete the local file after successful upload
        fs.unlinkSync(localFilePath);
        
        // RETURN the response - this was missing!
        return response;

    } catch (error) {
        fs.unlinkSync(localFilePath);
        console.log("Cloudinary Upload Failed", error);
        return null;
    }
}

export default uploadToCloudinary;
