// const asyncHandler = (fn) =>(req, res, next) =>{
//     try {
        
//     } catch (error) {
//         res.status(err.code || 500).json
//         success: false
//         message: err.messaged
        
//     }  // this is a try catch function their is a another funtion 
//     // which known as Promise funtion 
// }

// Promish Funtion 
const asyncHandler = (requestHandler) =>{ 
    return (req, res, next) =>{
        Promise.resolve(requestHandler(req, res, next)).catch
        ((err) => next(err))
    }
}

    export {asyncHandler}