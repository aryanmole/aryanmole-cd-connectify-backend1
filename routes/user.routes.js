import { Router } from "express";
import { acceptConnection, downloadUserProfile, getAllUserProfile, getMyConnectionRequest, getProfileBasedOnUsername, getUserAndProfile, login, register, updateProfileData, updateUserProfile, uploadProfilePicture, userSendConnectionReq, whatAreMyConnections } from "../controllers/user.controller.js";
import multer from 'multer'
import { authLimiter } from "../middleware/rateLimiter.js";
import { apiLimiter } from "../middleware/rateLimiter.js";


const router = Router()

const storage=multer.diskStorage({  // multer is used when we want to save uploaded img/video on coders desktop . this is becos it can't be saved on db . this is temporary soln but while deployment we have to connect this to cloud . ask gpt for explaination
    destination:(req,file,cb)=>{
        cb(null,'uploads/') //cb = callback function it is used becos cb calls upload immedaitely
    },
    filename:(req,file,cb)=>{
        cb(null,file.originalname)//file already include filename and originalname
    }
})

const upload = multer({storage:storage})

router.post('/update_profile_picture',
    upload.single('profile_picture'),
    uploadProfilePicture
);




router.post("/register",authLimiter, register);
router.post("/login",authLimiter,login)

router.post('/user_update',apiLimiter,updateUserProfile)
router.get('/get_user_and_profile',apiLimiter,getUserAndProfile)

router.post("/update_profile_data",apiLimiter,updateProfileData)

router.get('/user/get_all_user',apiLimiter,getAllUserProfile)

router.get("/user/download_resume",apiLimiter,downloadUserProfile)

router.post("/user/send_connection_request",apiLimiter,userSendConnectionReq)
router.get("/user/getConnectionRequest",getMyConnectionRequest)
router.get("/user/user_connection_request",whatAreMyConnections)
router.post("/user/acceptConnectionRequest",apiLimiter,acceptConnection)      

router.get("/user/get_profile_based_on_username",apiLimiter,getProfileBasedOnUsername)

export default router;