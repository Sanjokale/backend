import mongoose, { Schema } from "mongoose";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

const userSchema = new Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true, // it is better to set the index true for searching this field
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    fullname: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    avatar: {
      type: String, //cloudanary url
      required: true,
    },
    coverImage: {
      type: String,
    },
    watchHistory: [
      {
        type: Schema.Types.ObjectId,
        ref: "Video",
      },
    ],
    password: {
      type: String,
      required: [true, "password is required"],
    },
    refreshToken: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

userSchema.pre("save", async function (next) {
  //here we use normal function instead of arrow function because of arrow function doesnot hold the current context in "this" keyword. here pre is the mogoose hook which is execute before the save method. this is like a middleware which is execute whenever password is changes before save in the database.
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 10);  //this method is execute while the password is changes before save in the database
  next();
});

console.log("userschema", userSchema.methods);
//in mongoose we can inject the custom methods to it just like that middleware
// The userSchema in your Mongoose setup plays a crucial role in defining instance methods, such as isPasswordCorrect.
// Instance Method Creation
// Schema Definition:

// The userSchema is defined using new Schema({...}), which establishes the structure of the user documents in the database. This schema serves as a blueprint for creating user instances.
// Adding Instance Methods:

// You can add instance methods directly to the schema using userSchema.methods. This allows you to define functions that can be called on individual user instances.
userSchema.methods.isPasswordCorrect = async function (password) {
  return await bcrypt.compare(password, this.password);
  //In the context of instance methods, this refers to the specific instance of the user document. This is crucial because it allows the method to access instance-specific properties, such as this.password, which contains the hashed password for that particular user.
  //this method returns a true or false based on the comparision
};

userSchema.methods.generateAccessToken = function () {  //here in the context of instance method this refers to the specific instance of the user document and we can access the instance specific properties. and here we addded the method to the userSchema so that we can access this method to the user instance.
  return jwt.sign(
    {
      _id: this._id,
      email: this.email,
      username: this.username,
      fullname: this.fullname,
    },
    process.env.ACCESS_TOKEN_SECRET,
    {
      expiresIn: process.env.ACCESS_TOKEN_EXPIRY,
    }
  );
};

userSchema.methods.generateRefreshToken = function () {
  return jwt.sign(
    {
      _id: this._id,
    },
    process.env.REFRESH_TOKEN_SECRET,
    {
      expiresIn: process.env.REFRESH_TOKEN_EXPIRY,
    }
  );
};

export const User = mongoose.model("User", userSchema);
console.log("User", User);

//console.log(User.fullname);

// Use user.isPasswordCorrect(password) to validate the password against the specific user's stored hashed password.
// Using User .isPasswordCorrect(password) would not work correctly because it lacks access to the instance-specific data needed for validation.
