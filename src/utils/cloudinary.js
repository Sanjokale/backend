import { v2 as cloudinary } from "cloudinary";
import fs from "fs";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const uploadOnCloudinary = async (localFilePath) => {
  try {
    if (!localFilePath) return null;
    //upload file on cloudinary
    const response = await cloudinary.uploader.upload(localFilePath, {
      resource_type: "auto",
    });
    //file has beem  uploaded successfully
    //console.log('file is uploaded on cloudinary', response.url);
    fs.unlinkSync(localFilePath);  //here we use the unlinksync method, the sync means the the code is execute synchronously. here we remove the file from the local storage after the file is uploaded on the cloudinary, then we go to the next step.
    return response;
  } catch (error) {
    //fs.unlink() in Node.js, when you delete a symbolic link, you're only deleting the link itself, not the file or directory it points to. This is why fs.unlink() can be used to remove symbolic links, but not the actual files or directories they reference.
    fs.unlinkSync(localFilePath); //remove the locally saved temporary file as the upload operation got failed.
    return null;
  }
};

export { uploadOnCloudinary };


// import { v2 as cloudinary } from 'cloudinary';
// import fs from 'fs/promises';

// cloudinary.config({
//   cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
//   api_key: process.env.CLOUDINARY_API_KEY,
//   api_secret: process.env.CLOUDINARY_API_SECRET,
// });

// const uploadOnCloudinary = async (localFilePath) => {
//   try {
//     if (!localFilePath) {
//       console.error("No file path provided");
//       return { success: false, message: "No file path provided" };
//     }

//     // Upload file to Cloudinary
//     const response = await cloudinary.uploader.upload(localFilePath, {
//       resource_type: "auto",
//     });

//     // File has been uploaded successfully
//     console.log('File uploaded to Cloudinary:', response.url);
    
//     // Remove the local file
//     await fs.unlink(localFilePath);
    
//     return response;
//   } catch (error) {
//     console.error("Error uploading file to Cloudinary:", error);
    
//     // Remove the local file in case of error
//     try {
//       await fs.unlink(localFilePath);
//     } catch (unlinkError) {
//       console.error("Error deleting local file:", unlinkError);
//     }
    
//     return { success: false, message: "Upload failed", error: error.message };
//   }
// };

// export { uploadOnCloudinary };