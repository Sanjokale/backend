import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";
import { avatar } from "@nextui-org/react";

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
      $unset: {  //unset is used to remove the field from the document. unset is mongoose operator method
        refreshToken: 1,
      },
    },
    {
      new: true,  //here new is for it return the data after updated.
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

  const user = await User.findById(req.user?._id);
  const isPasswordCorrect = await user.isPasswordCorrect(oldPassword);

  if (!isPasswordCorrect) {
    throw new ApiError(400, "Invalid old Password");
  }

  user.password = newPassword; //
  await user.save({ validateBeforeSave: false }); //here validateBeforeSave false is use to only validate the password field in the user model. it skips the other fields in the user model to validate

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "password change successfully"));
});

const getCurrentUser = asyncHandler(async (req, res) => {
  //const user = await User.findById(req.user?.id).select("-password");
  return res
    .status(200)
    .json(
      new ApiResponse(200, req.user, "current user is fetched successfully")
    );
});

const updateAccountDetails = asyncHandler(async (req, res) => {
  const { fullname, email } = req.body;
  if (!fullname || !email) {
    throw new ApiError(400, "All fields are requird");
  }
  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        fullname,
        email: email,
      },
    },
    { new: true } //here new is for it return the data after updated.
  ).select("-password");
  return res
    .status(200)
    .json(new ApiResponse(200, user, "Account details updated successfully"));
});

//as possible as try to make file changes api different endpoint
const updateUserAvatar = asyncHandler(async (req, res) => {
  const avatarLocalPath = req.file?.path;

  if (!avatarLocalPath) {
    throw new ApiError(200, "Avatar file is missing");
  }
  //delete old image
  const avatar = await uploadOnCloudinary(avatarLocalPath);
  if (!avatar.url) {
    throw new ApiError(400, "Error while uploading on avatar");
  }

  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        avatar: avatar.url,
      },
    },
    {
      new: true,
    }
  );

  return res
    .status(200)
    .json(new ApiResponse(200, user, "Avatar upload successfully"));
});
const updateUserCoverImage = asyncHandler(async (req, res) => {
  const coverImageLocalPath = req.file?.path;

  if (!coverImageLocalPath) {
    throw new ApiError(200, "Avatar file is missing");
  }

  const coverImage = await uploadOnCloudinary(coverImageLocalPath);
  if (!coverImage.url) {
    throw new ApiError(400, "Error while uploading on avatar");
  }

  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        coverImage: coverImage.url,
      },
    },
    {
      new: true,
    }
  );

  return res
    .status(200)
    .json(new ApiResponse(200, user, "Cover Image upload successfully"));
});

const getUserChannelProfile = asyncHandler(async (req, res) => {
  const { username } = req.params;

  //Your userSchema does not contain fields like subscribers or subscribedTo that directly hold arrays of user IDs. The relationship is managed through the subscriptions collection.  populate works on fields within a document.  It can't traverse a separate collection to find related documents and then count them or check conditions.

  if (!username?.trim()) {
    throw new ApiError(400, "username is missing");
  }
  //const user = await User.findOne({ username })
  //here we want to use aggrigation pipeline
  const channel = await User.aggregate([
    {
      $match: {
        username: username?.toLowerCase(),
      },
    },
    {
      $lookup: {
        //here lookup from subscriptions is used to get the subscribers data from the subscriptions model or to join the subscriptions model with the user model
        from: "subscriptions",
        localField: "_id",
        foreignField: "channel",
        as: "subscribers",
      },
    },
    {
      $lookup: {
        from: "subscriptions",
        localField: "_id",
        foreignField: "subscriber",
        as: "subscribedTo",
      },
    },
    {
      $addFields: {
        subscribersCount: {
          $size: "$subscribers",
        },
        channelSubscribedToCount: {
          $size: "$subscribedTo",
        },
        isSubscribed: {
          $cond: { $in: [req.user._id, "$subscribers.subscriber"] },
          then: true,
          else: false,
        },
      },
    },
    {
      $project: {
        fullname: 1,
        username: 1,
        subscribersCount: 1,
        channelSubscribedToCount: 1,
        isSubscribed: 1,
        avatar: 1,
        coverImage: 1,
        email: 1,
      },
    },
  ]);
  if (!channel?.length) {
    throw new ApiError(404, "channel does not exists");
  }
  return res
    .status(200)
    .json(
      new ApiResponse(200, channel[0], "user channel fetched successfully")
    );

  //this is the datamodel that we get from the aggrigation pipeline if we dont use the project method.
  // [
  //   {
  //     "_id": "userId123",
  //     "username": "johndoe",
  //     "fullname": "John Doe",
  //     "avatar": "https://example.com/path/to/avatar.jpg",
  //     "coverImage": "https://example.com/path/to/cover.jpg",
  //     "subscribers": [
  //       {
  //         "_id": "subscriptionId1",
  //         "subscriberId": "userId456",
  //         "subscribedChannelId": "userId123",
  //         "createdAt": "2023-01-01T00:00:00.000Z",
  //         "updatedAt": "2023-01-01T00:00:00.000Z"
  //       },
  //       {
  //         "_id": "subscriptionId2",
  //         "subscriberId": "userId789",
  //         "subscribedChannelId": "userId123",
  //         "createdAt": "2023-01-02T00:00:00.000Z",
  //         "updatedAt": "2023-01-02T00:00:00.000Z"
  //       }
  //     ],
  //     "subscriptions": [
  //       {
  //         "_id": "subscriptionId3",
  //         "subscriberId": "userId123",
  //         "subscribedChannelId": "userId456",
  //         "createdAt": "2023-01-03T00:00:00.000Z",
  //         "updatedAt": "2023-01-03T00:00:00.000Z"
  //       },
  //       {
  //         "_id": "subscriptionId4",
  //         "subscriberId": "userId123",
  //         "subscribedChannelId": "userId789",
  //         "createdAt": "2023-01-04T00:00:00.000Z",
  //         "updatedAt": "2023-01-04T00:00:00.000Z"
  //       }
  //     ],
  //     "subscribersCount": 2,
  //     "subscriptionsCount": 2
  //   }
  // ]

  //another way:


// Get user profile with subscriber and subscription counts
// router.get('/user/:username', async (req, res) => {
//   const { username } = req.params;

//   try {
//     // Find the user by username
//     const user = await User.findOne({ username: username.toLowerCase() });

//     if (!user) {
//       return res.status(404).json({ message: 'User not found' });
//     }

//     // Count the number of subscribers
//     const subscribersCount = await Subscription.countDocuments({
//       subscribedChannelId: user._id,
//     });

//     // Count the number of subscriptions
//     const subscriptionsCount = await Subscription.countDocuments({
//       subscriberId: user._id,
//     });

//     // Prepare the response data
//     const userProfile = {
//       fullname: user.fullname,
//       username: user.username,
//       avatar: user.avatar,
//       coverImage: user.coverImage,
//       subscribersCount,
//       subscriptionsCount,
//     };

//     return res.status(200).json({
//       message: 'User profile fetched successfully',
//       data: userProfile,
//     });
//   } catch (error) {
//     return res.status(500).json({ message: 'Error fetching user profile', error });
//   }
// });


//another way using mongoose populate method:
// const getUserChannelProfile = asyncHandler(async (req, res) => {
//   const { username } = req.params;

//   if (!username?.trim()) {
//     throw new ApiError(400, "username is missing");
//   }

//we have to add the subscribers and subscribedTo field in the user model to use the populate method.

//   // Find the user by username
//   const channel = await User.findOne({ username: username.toLowerCase() })
//     .populate({
//       path: 'subscribers', // Populate the subscribers
//       model: 'Subscription',
//       match: { channel: req.user._id }, // Match the current user's subscriptions
//     })
//     .populate({
//       path: 'subscribedTo', // Populate the channels the user is subscribed to
//       model: 'Subscription',
//       match: { subscriber: req.user._id }, // Match the current user's subscriptions
//     });

//   if (!channel) {
//     throw new ApiError(404, "channel does not exist");
//   }

//   // Count subscribers and subscriptions
//   const subscribersCount = await Subscription.countDocuments({ channel: channel._id });
//   const channelSubscribedToCount = await Subscription.countDocuments({ subscriber: req.user._id });

//   // Check if the current user is subscribed to the channel
//   const isSubscribed = channel.subscribers.some(sub => sub.subscriber.toString() === req.user._id.toString());

//   return res.status(200).json(
//     new ApiResponse(200, {
//       fullname: channel.fullname,
//       username: channel.username,
//       subscribersCount,
//       channelSubscribedToCount,
//       isSubscribed,
//       avatar: channel.avatar,
//       coverImage: channel.coverImage,
//       email: channel.email,
//     }, "user channel fetched successfully")
//   );
// });



});

const getWatchHistory = asyncHandler(async (req, res) => {
  //if we use mongoose populate method
  // const user = await User.findById(userId).populate({
  //   path: 'watchHistory',
  //   model: 'Video',
  //   populate: { // Nested population for the video owner
  //     path: 'owner',  // The field in the Video model to populate
  //     model: 'User', // The model to use for the owner
  //     select: 'username fullname avatar', // Select specific fields from the User model (optional)
  //   },
  // });

  const user = await User.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(req.user._id), //in the aggrigation pipeline we have to define objectId for mongodb id
      },
    },
    {
      $lookup: {
        //lookup is the aggrigation pipeline method to get data from another data model or collection
        from: "videos",
        localField: "watchHistory",
        foreignField: "_id",
        as: "watchHistory", //here we use nested pipeline because of the in the pipeline we have also one owner field to get data from another data model or collection
        pipeline: [
          {
            $lookup: {
              //here lookup from user is used to get the owner data from the user model
              from: "users",
              localField: "owner",
              foreignField: "_id",
              as: "owner",
              pipeline: [
                {
                  $project: {
                    //project is used to get the specific fields from the user model
                    fullname: 1,
                    username: 1,
                    avatar: 1,
                  },
                },
              ],
            },
          },
          {
            $addFields: {
              //addFields is used for the get first item or 0 index value form the array comming after aggrigation pipeline.
              owner: {
                $first: "$owner",
              },
            },
          },
        ],
      },
    },
  ]);
  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        user[0].watchHistory,
        "watch history fetch successfully"
      )
    );
});
export {
  registerUser,
  loginUser,
  logoutUser,
  refreshAccessToken,
  changeCurrentPassword,
  getCurrentUser,
  updateAccountDetails,
  updateUserAvatar,
  updateUserCoverImage,
  getUserChannelProfile,
  getWatchHistory,
};
