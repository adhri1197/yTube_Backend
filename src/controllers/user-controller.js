import { asyncHandler} from "../utiles/asyncHandler.js"
import {ApiError} from "../utiles/ApiError.js"
import { User } from "../models/user_model.js"
import { uploadOnCloudinary } from "../utiles/cloudinary.js"
import { ApiResponse } from "../utiles/ApiResponse.js"
const registerUser = asyncHandler( async (req, res) =>{
   //1.get user detials from frontend
   //2.validation cheak for userdata - not empty
   //3.cheak if user is alredy ragister by - username or email 
   //4.cheak for avatar becuse it's req.
   //5.upload them on cloudinary
   //6.creat user object - create entry in db
   //7.remove password and refresh token filed from responce 
   //8.cheak user is created or  not 
   //9.return res

   //1.
   const {fullName, email, username, password} = req.body
   console.log("email:",email);

   //2.
   if(
    [fullName, email, username,password].some((field) =>
    field?.trim() === "")
   ){
    throw new ApiError(400,"All fields are required")
   }

   //3.
   const existedUser = User.findOne({
    $or: [{ username }, { email }]
   })

   if (existedUser){
    throw new ApiError(409,"User is already existed with already existed ")
   }

   //4.
   const avatarLocalPath = req.files?.avatar[0]?.path;
   const coverImageLocalPath = req.files?.coverImage[0]?.path;

   if(!avatarLocalPath){
    throw new ApiError(400, "Avatar file is required")
   }

   //5.
   const avatar = await uploadOnCloudinary(avatarLocalPath)
   const coverImage = await uploadOnCloudinary(coverImageLocalPath)

   //6.
   if (!avatar){
    throw new ApiError(400, "Avatar file is required")
   }

   //7.
   const user = await User.create({
    fullName, 
    avatar: avatar.url,
    coverImage: coverImage?.url || "",
    email,
    password,
    username: username.toLowerCase()
   })

   //8.
   const createdUser =  await User.findById(user._id).select(
    "-password - refreshToken"
   )

   if (!createdUser){
    throw new ApiError(500, "Something went wroung while registering the user")
   }

   //9.
   return res.status(201).json(
      new ApiResponse(200, createdUser, "user registered Successfully")
   )
   
})
export {registerUser}