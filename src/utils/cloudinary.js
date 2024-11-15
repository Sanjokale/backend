import { v2 as cloudinary } from "cloudinary";


cloudinary.config({ 
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
    api_key: process.env.CLOUDINARY_API_KEY, 
    api_secret: process.env.CLOUDINARY_API_SECRET 
});

const uploadOnCloudinary = async (locaFilePath) => {
   try {
    if(!locaFilePath) return null;
    //upload file on cloudinary
    const response = await cloudinary.uploader.upload(locaFilePath, {
        resource_type: "auto"
    })
    //file has beem  uploaded successfully
    //console.log('file is uploaded on cloudinary', response.url);
    fs.unlinkSync(locaFilePath)
    return response;
    
   } catch (error) {
    //fs.unlink() in Node.js, when you delete a symbolic link, you're only deleting the link itself, not the file or directory it points to. This is why fs.unlink() can be used to remove symbolic links, but not the actual files or directories they reference.
    fs.unlinkSync(locaFilePath)//remove the locally saved temporary file as the upload operation got failed.
    return null;
   }
}

export {uploadOnCloudinary}