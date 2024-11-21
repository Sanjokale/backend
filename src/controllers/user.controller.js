import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";

const generateAccessAndRefreshTokens = async (userId) => {
  try {
    const user = await User.findById(userId);
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateAccessToken();

    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false }); //save the refresh token to the user document.
    //The save method in Mongoose is used to persist changes made to a document in the MongoDB database.
    //When you modify a document (like updating the refreshToken field), those changes exist only in memory until you explicitly save them. The save method writes the changes back to the database.
    //By default, Mongoose runs validation on the document before saving it. This ensures that the data conforms to the schema defined for that model. In your case, you used validateBeforeSave: false, which skips this validation. This can be useful if you are confident that the data is valid or if you want to bypass validation for certain operations.
    //Mongoose allows you to define middleware (pre and post hooks) that can be executed before or after the save operation. This can be useful for tasks such as logging, sending notifications, or performing other actions based on the save operation.
    //After calling save, the updated document is returned, which can be useful if you need to work with the latest data immediately after saving.
    return { accessToken, refreshToken };
  } catch (error) {
    throw new ApiError(
      500,
      "Something Went Wrong while generationg refresh and access token"
    );
  }
};

const registerUser = asyncHandler(async (req, res) => {
  // return res.status(200).json({
  //   message: "ok",
  // });
  //steps or algorithm for user controller:
  //gert user details from frontend
  //validation not empty
  //check if user already exists: username, email
  //check for images, check for avatar
  //upload them to cloudinary, avatar
  //create a user object- create entry in db
  //remove password and refresh token field from response
  //check for user creation
  //return res

  const { fullname, email, username, password } = req.body;
  console.log({ fullname, email, username, password });

  if (
    [fullname, email, username, password].some((field) => field?.trim() === "")
  ) {
    //The some() method is an iterative method, which means it calls a provided callbackFn function once for each element in an array, until the callbackFn returns a truthy value. If such an element is found, some() immediately returns true and stops iterating through the array. Otherwise, if callbackFn returns a falsy value for all elements, some() returns false.
    //some method return true or false value if this method itertate until the value got true any of the condition and immediately stops the iteration and return a true value

    throw new ApiError(400, "All fields are required");
  }

  const existedUser = await User.findOne({
    //mongoose method
    $or: [{ username }, { email }],
  });

  if (existedUser) {
    throw new ApiError(400, "Username or Email already exists");
  }

  //multer helps us to access files in req parameter in callback just like express gives body access in req paramater
  const avatarLocalPath = req.files?.avatar[0]?.path;
  console.log("avatarLocalPath: ", avatarLocalPath);

  //const coverImageLocalPath = req.files?.coverImage[0]?.path;
  let coverImageLocalPath;
  if (
    req.files &&
    Array.isArray(req.files.coverImage) &&
    req.files.coverImage.length > 0
  ) {
    coverImageLocalPath = req.files?.coverImage[0]?.path;
  }

  console.log("COVERIMAGEFILEPATH:", coverImageLocalPath);

  if (!avatarLocalPath) {
    //checking avatar is upload or not
    throw new ApiError(400, "Avatar field is requird");
  }

  const avatar = await uploadOnCloudinary(avatarLocalPath); //we set await because it might take some time to upload a file in the cloudinary
  const coverImage = await uploadOnCloudinary(coverImageLocalPath);
  console.log("coverImage:", coverImage);

  if (!avatar) {
    return new ApiError(400, "Avatar is requird field");
  }

  const user = await User.create({
    fullname,
    avatar: avatar.url,
    coverImage: coverImage?.url || "",
    email,
    password,
    username: username.toLowerCase(),
  });

  const createdUser = await User.findById(user._id).select(
    //the select method is not a native JavaScript method. It's a method provided by the Mongoose library, which is a popular ORM (Object Relational Mapping) tool for MongoDB in Node.js.
    "-password -refreshToken"
  );

  if (!createdUser) {
    throw new ApiError("something went wrong while resteringt the user");
  }

  return res
    .status(201)
    .json(new ApiResponse(200, createdUser, "User resgisterd successfully"));
});

const loginUser = asyncHandler(async (req, res) => {
  //request body -> data
  //username or email
  //find the user
  //password check
  //generate access token and refresh token and send to user
  //send token via cookies

  const { email, username, password } = req.body;
  // console.log(email);

  if (!email && !username) {
    throw new ApiError(400, "username or password is required");
  }

  //this is the database query
  const user = await User.findOne({
    $or: [{ username }, { email }],
  });

  console.log(user);

  //here user is mine user that i make it is the instance of User

  if (!user) {
    throw new ApiError(404, "User does not exist");
  }

  const isPasswordValid = await user.isPasswordCorrect(password); //instance method

  if (!isPasswordValid) {
    throw new ApiError(401, "invalid user credentials");
  }

  const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(
    user._id
  );

  const loggedInUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  //send cookies
  const options = {
    httpOnly: true,
    secure: true,
  }; //this help to make cookie mofifiable only from server. Generally cookies can modified from both frontend and backend

  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiResponse(
        200,
        {
          user: loggedInUser,
          accessToken,
          refreshToken,
        },
        "User logged In Successfully"
      )
    );
});

const logoutUser = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(
    req.user._id,
    {
      $unset: {
        refreshToken: 1,
      },
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
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "User logged Out Successfully"));
});

const refreshAccessToken = asyncHandler(async (req, res) => {
  const incomingRefreshToken =
    req.cookies.refreshToken || req.body.refreshToken; //here we say incoming refresh token because we have also refresh token in database.

  if (!incomingRefreshToken) {
    throw new ApiError(401, "unauthorized request");
  }

  //verify refreshtoken
  try {
    const decodedToken = jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET
    ); //we need decoded token because in the database the refresh token is saved as the decoded version

    const user = await User.findById(decodedToken?._id);

    if (!user) {
      throw new ApiError(401, "invalid refresh token");
    }

    if (incomingRefreshToken !== user?.refreshToken) {
      throw new ApiError(401, "refresh token is used or expired");
    }

    const options = {
      httpOnly: true,
      secure: true,
    };

    const { accessToken, newRefreshToken } =
      await generateAccessAndRefreshTokens(user._id);

    return res
      .status(200)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", newRefreshToken, options)
      .json(
        new ApiResponse(
          200,
          { accessToken, refreshToken: newRefreshToken },
          "Access token refreshed"
        )
      );
  } catch (error) {
    throw new ApiError(401, error?.message || "Invalid refresh token");
  }
});

const changeCurrentPassword = asyncHandler(async (req, res) => {
  const { oldPassword, newPassword } = req.body;

  const user = await User.findById(req.user?.id);
  const isPasswordCorrect = await user.isPasswordCorrect(oldPassword);

  if (!isPasswordCorrect) {
    throw new ApiError(400, "Invalid old Password");
  }

  user.password = newPassword;  //
  await user.save({ validateBeforeSave: false }); //here validateBeforeSave false is use to only validate the password field in the user model. it skips the other fields in the user model to validate

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "password change successfully"));
});

export { registerUser, loginUser, logoutUser, refreshAccessToken, changeCurrentPassword };
