import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import jwt from "jsonwebtoken";

export const verifyJWT = asyncHandler(async (req, _, next) => {
  try {
    const token =
      req.cookies?.accessToken ||
      req.header("Authorization")?.replace("Bearer ", ""); //replace method delete the substring ofstring

    if (!token) {
      throw ApiError(401, "Unauthorized request");
    }

    const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    // console.log(  "decodedToken",decodedToken);
    // decodedToken {
    //   _id: '67caf83673fda3d5baa9f1fa',
    //   email: 'sanjok@gmail.com',
    //   username: 'sanjokale',
    //   fullname: 'sanjok alemagar',
    //   iat: 1741702384,
    //   exp: 1741788784
    // }
    

    const user = await User.findById(decodedToken?._id).select(
      "-password -refreshToken"
    );

    if (!user) {
      //next video discuss about frontend
      throw new ApiError(401, "Invalid Access Token");
    }

    req.user = user;
    next();
  } catch (error) {
    throw new ApiError(401, "Invalid Access Token");
  }
});
