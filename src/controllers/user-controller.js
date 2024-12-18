import { asyncHandler} from "../utiles/asyncHandler.js"
import {ApiError} from "../utiles/ApiError.js"
import { User } from "../models/user_model.js"
import { uploadOnCloudinary } from "../utiles/cloudinary.js"
import { ApiResponse } from "../utiles/ApiResponse.js"
import jwt from "jsonwebtoken"

const generateAccessandRefreshTokens = async(userId) =>{
    try {
        const user = await User.findById(userId)
        const accessToken =  user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()

        user.refreshToken = refreshToken
        await user.save({ validateBeforeSave: false })

        return {accessToken, refreshToken}
        
    } catch (error) {
        throw new ApiError(500, "Something went wrong while gentering Tokens ")
    }
}


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
   
   //1
   const {fullName, email, username, password } = req.body
   console.log("email: ", email);
   
   //2
   if (
       [fullName, email, username, password].some((field) => field?.trim() === "")
   ) {
       throw new ApiError(400, "All fields are required")
   }
    
   //3
   const existedUser = await User.findOne({
       $or: [{ username }, { email }]
   })

   if (existedUser) {
       throw new ApiError(409, "User with email or username already exists")
   }
   //console.log(req.files);
   
   //4
   const avatarLocalPath = req.files?.avatar[0]?.path;
   //const coverImageLocalPath = req.files?.coverImage[0]?.path;

   let coverImageLocalPath;
   if (req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) {
       coverImageLocalPath = req.files.coverImage[0].path
   }
   

   if (!avatarLocalPath) {
       throw new ApiError(400, "Avatar file is required")
   }
   
   //5
   const avatar = await uploadOnCloudinary(avatarLocalPath)
   const coverImage = await uploadOnCloudinary(coverImageLocalPath)

   if (!avatar) {
       throw new ApiError(400, "Avatar file is required")
   }
  
   //6
   const user = await User.create({
       fullName,
       avatar: avatar.url,
       coverImage: coverImage?.url || "",
       email, 
       password,
       username: username.toLowerCase()
   })
   
   //7
   const createdUser = await User.findById(user._id).select(
       "-password -refreshToken"
   )
   
   //8
   if (!createdUser) {
       throw new ApiError(500, "Something went wrong while registering the user")
   }

   //9
   return res.status(201).json(
       new ApiResponse(200, createdUser, "User registered Successfully")
   )

} )

const logInUser = asyncHandler(async(req, res ) => {
   // 1 req.body -> data 
   // 2 email or username -> for logIn 
   // 3 find the user with given data 
   // 4 password cheak 
   // 5 generate access or refresh token 
   // 6 send cookes  
   
   // 1 
  const {email, username, password} = req.body
    console.log(email);

    if (!username && !email) {
        throw new ApiError(400, "username or email is required")
    }
    
    // Here is an alternative of above code based on logic discussed in video:
    // if (!(username || email)) {
    //     throw new ApiError(400, "username or email is required")
        
    // }

    const user = await User.findOne({
        $or: [{username}, {email}]
    })

    if (!user) {
        throw new ApiError(404, "User does not exist")
    }

   const isPasswordValid = await user.isPasswordCorrect(password)

   if (!isPasswordValid) {
    throw new ApiError(401, "Invalid user credentials")
    }


    const {  accessToken, refreshToken } = await generateAccessandRefreshTokens (user._id)
    const loggedInUser = await User.findById(user._id).select("-password -refreshToken")

    const options = {
        httpOnly: true,
        secure: true
    }

    return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
        new ApiResponse(
            200, 
            {
                user: loggedInUser, accessToken, refreshToken
            },
            "User logged In Successfully"
        )
    )

})

const logOutUser = asyncHandler(async (req, res) => {
    try {
        // Log the user details for debugging purposes
        console.log(`Logging out user: ${req.user._id}, Email: ${req.user.email}`);
        
        await User.findByIdAndUpdate(
            req.user._id,
            {
                $unset: {
                    refreshToken: 1 // This removes the field from the document
                }
            },
            {
                new: true
            }
        );

        const options = {
            httpOnly: true,
            secure: true,
            sameSite: "None" // Added for cross-site cookie compatibility
        };

        return res
            .status(200)
            .clearCookie("accessToken", options)
            .clearCookie("refreshToken", options)
            .json(new ApiResponse(200, {}, "User logged out"));
    } catch (error) {
        console.error(`Error while logging out user: ${error.message}`);
        return res.status(500).json(new ApiResponse(500, {}, "Failed to log out"));
    }
});



const refreshAccessToken = asyncHandler(async(req, res) =>{
    const incomingRefreshToken =  req.cookies.refreshToken
     || req.body.refreshToken
    
    if(!incomingRefreshToken){
        throw new ApiError(401,"Refresh token is required")
    }

   try {
    const decodedToken = jwt.verify(
         incomingRefreshToken,
         process.env.REFRESH_TOKEN_SECRET 
     )
 
    const user = await User.findById(decodedToken?._id)
 
    if(!user){
     throw new ApiError(401,"invalid refresh token")
     }
 
    if(incomingRefreshToken !== user?.refreshToken){
     throw new ApiError(401,"refresh token is expired or used")
    }
 
    const options ={
     httpOnly: true,
     secure:process.env.NODE_ENV ==="production"
    }

    
    const {accessToken, newRefreshToken} =  await
    generateAccessandRefreshTokens(user._id)
 
    return res 
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", newRefreshToken, options)
    .json(
     new ApiResponse(
         200,
         {accessToken, refreshToken: newRefreshToken},
         "Access token refreshed"
     )
    )
 
   } catch (error) {
        throw new ApiError(401,error?.message || 
            "invalid refresh token"
        )
   }
})

const changeCurrentPassword = asyncHandler(async(req, res) => {
    const {oldPassword, newPassword} = req.body

    

    const user = await User.findById(req.user?._id)
    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword)

    if (!isPasswordCorrect) {
        throw new ApiError(400, "Invalid old password")
    }

    user.password = newPassword
    await user.save({validateBeforeSave: false})
    console.log(`Passworrd changed for user ID: ${user._id}`);

    return res
    .status(200)
    .json(new ApiResponse(200, {}, "Password changed successfully"))
})

const getCurrentUser = asyncHandler(async(req, res) =>{
    return res
    .status(200)
    .json(new ApiResponse (200 ,"User fetched successfully"))

}); 

const updateAccountDetails = asyncHandler(async(req, res) => {
    const {fullName, email} = req.body

    if(!fullName || !email) {
        throw new ApiError(400, 'Both fields are required')
    }

    const user = User.findByIdAndUpdate(
        req.user?._id,
        {
            $set:{
                fullName: fullName,
                email: email
            }
        },
        {new: true}

    ).select("-password")

    return res
    .status(200)
    .json(new ApiResponse(200, user ,"Account Updated Successfully"))

});

const updateCoverImage = asyncHandler(async(req, res) =>{
     
    const coverImageLocalPath  = req.file?.path

    if(!coverImageLocalPath){
        throw new ApiError(400,"Cover Image file is missing")
    }

    const coverImage =  await uploadOnCloudinary
    (coverImageLocalPath)

    if(!coverImage.url){
        throw new ApiError(400,"Error while uploading on cover image")
    }

    const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
        $set:{
            coverImage: coverImage.url
        }
    },
    {new: true}
    ).select("-password")

    return res
    .status(200)
    .json(new ApiResponse(200, user ,"Cover Image Updated Successfully"))
})

const updateAvatar = asyncHandler(async(req, res) =>{
     
    const avatarLocalPath = req.file?.path

    if(!avatarLocalPath){
        throw new ApiError(400,"Avatar file is missing")
    }

    const avatar =  await uploadOnCloudinary
    (avatarLocalPath)

    if(!avatar.url){
        throw new ApiError(400,"Error while uploading on avatar")
    }

    const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
        $set:{
            avatar: avatar.url
        }
    },
    {new: true}
    ).select("-password")

    return res
    .status(200)
    .json(new ApiResponse(200, user ,"Avatar Updated Successfully"))
})


const getUserChannelProfile = asyncHandler(async(req,res) => {
     const {username} = req.params 
     if(!username?.trim()){
        throw new ApiError(400, "user is missing")
     }

     const channel = User.aggregate([
        {
        $match: {
            username: username?.totalLowerCase()
        }
    },
    // to cheak how many subscriber the channel have 

    {
        $lookup:{
            from: "subscriptions",
            localField: "_id",
            foreignField: "channel",
            as: "subscribers "
        }
    },
    // to cheak how many channel is subscribed by this channel
    {
        $lookup: {
            from: "subscriptions",
            localField: "_id",
            foreignField: "channel",
            as: "subscribedTo"
        }
    },
    {
        $addFields:{
            subscribersCount: {
                $size: "$subscribers"
            },
            channelsSubscribedToCount: {
                $size:"subscribedTo"
            },
            isSubscribed: {
                $cond: {
                    if: {$in:[req.user?._id,"$subscribers.subscriber"]},
                    then: true,
                    else: false
                }
            }
        }
    },
    {
        $project: {
            fullName: 1,
            username: 1,
            subscribersCount: 1,
            channelsSubscribedToCount: 1,
            isSubscribed: 1,
            avatar: 1,
            coverImage: 1,
            email: 1
        }
    }
     ])
     if(!channel?.length) {
        throw new ApiError(404, "channel does not exists")
     }

     returnres
     .status(200)
     .json(
        new ApiResponse(200, channel[0],"User channel fetched successfully ")
     )
}) 

const getWatchHistory = asyncHandler(async(req,res)=>{
    const user = await User.aggregate([
        {
            $match:{
                _id: new mongoose.Types.ObjectId(req.user._id)
            }
        },
        {
            $lookup:{
                from: "videos",
                localField:"watchHistory",
                foreignField: "_id",
                as: "WatchHistory",
                pipeline: [
                    {
                        $lookup:{
                            from: "users",
                            localField: "owner",
                            foreignField: "_id",
                            as: "owner",
                            pipeline :[
                                {
                                    $project:{
                                        fullName: 1,
                                        username: 1,
                                        avatar: 1
                                    }
                                }
                            ]
                        }
                    },
                    {
                      $addFields:{
                        owner: {
                            $first: "$owner"
                        }
                      }   
                    }

                ]
            }
        }
    ])

    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            user[0].watchHistory,
            "watch history fetched successfully"
        )
    )
})


export {
    registerUser,
    logInUser,
    logOutUser,
    refreshAccessToken,
    changeCurrentPassword,
    getCurrentUser,
    updateAccountDetails,
    updateAvatar,
    updateCoverImage,
    getUserChannelProfile,
    getWatchHistory
} 