import Profile from '../models/profile.model.js'
import User from '../models/user.model.js'
import bcrypt from 'bcrypt'
import crypto from "crypto"
import PDFDocument from 'pdfkit'
import fs from 'fs'
import connection from '../models/connections.model.js'
import { CACHE_KEYS, getCached, setCached } from '../utils/cache.js'
import {
    invalidateAllUsers,
    invalidateConnectionCaches,
    invalidateConnectionCachesByUserIds,
    invalidateUserProfile
} from '../utils/cacheInvalidation.js'

const convertUserDataToPDF = async(userData)=>{
    const doc = new PDFDocument

    const outputPath = crypto.randomBytes(32).toString("hex")+".pdf"; //Generates 32 random bytes Converts those bytes into a readable string32 bytes → 64 hex characters and Adds file extension

    const stream = fs.createWriteStream("uploads/"+outputPath) // create a writable file stream where the PDF will be saved

    doc.pipe(stream)// open a file stream and write the generated PDF into it

    doc.image(`uploads/${userData.userId.profilePicture}`,{align:"center",width:100})
    doc.fontSize(14).text(`Name: ${userData.userId.name}`)
    doc.fontSize(14).text(`Username: ${userData.userId.username}`)
    doc.fontSize(14).text(`Email: ${userData.userId.email}`)
    doc.fontSize(14).text(`Bio: ${userData.bio}`)
    doc.fontSize(14).text(`Current position: ${userData.currentPost}`)

    doc.fontSize(14).text("Past Work:")
    userData.pastWork.forEach((work,index) => {
        doc.fontSize(14).text(`Company name: ${work.company}`)
        doc.fontSize(14).text(`Position: ${work.position}`)
        doc.fontSize(14).text(`Years: ${work.years}`)
    });

    doc.end();

    return outputPath
}

//there are various status and their meaning google them
export const register = async (req,res)=>{
    try{
        const {name,email,password,username} = req.body
        if(!name || !email || !password || !username){
            return res.status(400).json({message:"all fields req"})
        }

        const user = await User.findOne({
            email
        })// checks in db if email exist

        if(user){
            return res.status(400).json({message:"user already exist"})
        }

        const hashedPassword = await bcrypt.hash(password,10)

        const newUser = new User({
            name,
            email,
            password:hashedPassword,
            username
        })

        await newUser.save() // this saves in db

        const profile = new Profile({userId: newUser._id}) // this connects user db to profile db via userid check both models

        await profile.save()

        await invalidateAllUsers()

        return res.json({message:"User registered successfully"})
       
    }catch(err){
        return res.status(500).json({message:err.message})
    }
}

export const login = async(req,res)=>{
    try{
        const{email,password} = req.body

        if(!email || !password){
            return res.status(400).json({message:"input not found"})
        }

        const user = await User.findOne({
            email
        })

        if(!user){
            return res.status(404).json({message:"user does not exist"})
        }

        const isMatch = await bcrypt.compare(password,user.password)

        if(!isMatch){
            return res.status(400).json({message:"Invalid credential"})
        }

        const token = crypto.randomBytes(32).toString("hex")

        await User.updateOne({_id: user.id},{ token })

        return res.json({ token:token })
        
    }catch(err){
        return res.status(500).json({message:err.message})
    }
}

export const uploadProfilePicture = async(req,res)=>{
    const {token} = req.body

    try{
        const user = await User.findOne({token:token}) //this means in User's token in db it checks if current token matches

        if(!user){
            return res.status(400).json({message:"USer not found"})
        }

        user.profilePicture = req.file.filename //suppose img orginal name is "mypic.jpg", in req.file it's filename is "167873452_mypic.jpg" so this filename is stored in db not original name becos multiple user with diff img can upload diff img with same name filename kind of hashes it

        await user.save()

        await invalidateUserProfile(token)
        await invalidateAllUsers()

        return res.json({message:"Profile picture updated"})

    }catch(err){
        return res.status(500).json({message:err.message})
    }
}

export const updateUserProfile = async(req,res)=>{

    try{
        const {token,...newUserData} = req.body //spread op used so all the user info can be cpoied in newUserData

        const user = await User.findOne({token:token}) // this means in User's token in db it checks if token matches

        if(!user){
            return res.status(404).json({message:"user does not exist"})
        }

        const { username, email } = newUserData

        let existingUsername = null
        if (username || email) {
            const orConditions = []
            if (username) orConditions.push({ username })
            if (email) orConditions.push({ email })
            existingUsername = await User.findOne({ $or: orConditions })
        } //“Find any user in the DB whose username OR email matches the new data.”

        if (existingUsername && String(existingUsername._id) !== String(user._id)) { //so first existingUsername find if username,email exist in db then it matches obj id in string with user which takes username,email on bases of token then if they dont match then username already exist
            return res.status(400).json({ message: "Username or email already exists" })
        }

        Object.assign(user,newUserData)//“Copy all properties from newUserData into user and overwrite any existing ones with the same name.”

        await user.save()

        await invalidateUserProfile(token)
        await invalidateAllUsers()

        return res.json({message:"user is updated"})

    }catch(err){
        return res.json({message:err.message})
    }
} 

export const getUserAndProfile =  async(req,res)=>{
    try{
        const {token} = req.query

        if(!token){
            return res.status(400).json({message:"token is required"})
        }

        const cacheKey = CACHE_KEYS.userProfile(token)
        const cachedProfile = await getCached(cacheKey)

        if(cachedProfile){
            return res.json({userProfile: cachedProfile})
        }

        const user = await User.findOne({token:token})

        if(!user){
            return res.status(404).json({message:"user does not exist"})
        }

        const userProfile = await Profile.findOne({userId:user._id})
            .populate('userId','name email username profilePicture')
            .lean()

        await setCached(cacheKey, userProfile)

        return res.json({userProfile})


    }catch(err){
        return res.json({message:err.message})
    }
}

export const updateProfileData = async(req,res)=>{
        try{        
            const {token,...newProfileData} = req.body
            
            const userProfile = await User.findOne({token:token})
            
            if(!userProfile){
                return res.status(404).json({message:"user not found"})
            }

            const profile_to_update = await Profile.findOne({userId:userProfile._id}) //foriegn key

            Object.assign(profile_to_update,newProfileData)

            await profile_to_update.save()

            await invalidateUserProfile(token)
            await invalidateAllUsers()

            return res.json({message:"Profile updated"})

            //in this code first all info is copied in newProfileData except token with help of token then check if userProfile exists or not then profile_to_update find id in which matches with user._id from User db and with Object.assign(profile_to_update,newProfileData) we merge changed data and save in Profile db

        }catch(err){
            return res.json({message:err.message})
        }
}

export const getAllUserProfile = async(req,res)=>{
    try{
        const cacheKey = CACHE_KEYS.allUsers
        const cachedProfiles = await getCached(cacheKey)

        if(cachedProfiles){
            return res.json({profile: cachedProfiles})
        }

        const profile = await Profile.find()
            .populate('userId','name username email profilePicture')
            .lean()

        await setCached(cacheKey, profile)

        return res.json({profile})


    }catch(err){
        return res.json({message:err.message})
    }
}


export const downloadUserProfile = async(req,res)=>{
    try{

        const user_id = req.query.id //used for get req for getting user's id

        

        const userProfile = await Profile.findOne({userId:user_id}).populate('userId','name username email profilePicture')

        let outputPath = await convertUserDataToPDF(userProfile)

        return res.json({"message": outputPath })

    }catch(err){
        return res.json({message:err.message})
    }
}


export const userSendConnectionReq = async(req,res)=>{
    
    const{token,connectionId} = req.body

    try{

        const user=await User.findOne({token:token}) 

         if(!user){
            return res.status(404).json({message:"user does not exist"})
        }

        const connectionUser = await User.findOne({_id:connectionId})

        if(!connectionUser){
             return res.status(404).json({message:"connection does not exist"})
        }

        const existingRequest = await connection.findOne({
            userId:user._id,
            connectionId:connectionUser._id
        })

        if(existingRequest){
            return res.status(400).json({message:"req already sent"})
        }

        const request = new connection({
            userId:user._id,
            connectionId:connectionUser._id
        })

        await request.save()

        await invalidateConnectionCaches(token)
        await invalidateConnectionCachesByUserIds([user._id, connectionUser._id])

        return res.json({message:"request sent"})
    }catch(err){
        return res.json({message:err.message})
    }

}

export const getMyConnectionRequest = async(req,res)=>{ //req sent by me

    const{token} = req.query

    try{
        if(!token){
            return res.status(400).json({message:"token is required"})
        }

        const cacheKey = CACHE_KEYS.sentConnections(token)
        const cachedConnections = await getCached(cacheKey)

        if(cachedConnections){
            return res.json({connect: cachedConnections})
        }

        const user = await User.findOne({token:token})

        if(!user){
            return res.status(404).json({message:"user does not exist"})
        }
        const connect = await connection
            .find({userId:user._id})
            .populate({ path: 'connectionId', select: 'name username email profilePicture' })
            .lean()

        await setCached(cacheKey, connect)

        return res.json({connect})

    }catch(err){
        return res.json({message:err.message})
    }
}

export const whatAreMyConnections = async(req,res)=>{   //token → find user → get user._id → find connections

    const{token} = req.query

    try{
        if(!token){
            return res.status(400).json({message:"token is required"})
        }

        const cacheKey = CACHE_KEYS.receivedConnections(token)
        const cachedConnections = await getCached(cacheKey)

        if(cachedConnections){
            return res.json(cachedConnections)
        }

        const user = await User.findOne({token:token})

        if(!user){
            return res.status(404).json({message:"user does not exist"})
        }

        const connects = await connection
            .find({connectionId:user._id})
            .populate('userId','name username email profilePicture')
            .lean()

        await setCached(cacheKey, connects)

        return res.json(connects)

    }catch(err){
        return res.json({message:err.message})
    }
}

export const acceptConnection =  async(req,res)=>{
      const{token,requestId,action_type} = req.body

    try{

        const user = await User.findOne({token:token})

        if(!user){
            return res.status(404).json({message:"user does not exist"})
        }

        const connect = await connection.findOne({_id:requestId})

        if(!connect){
            return res.status(404).json({message:"connection not found"})
        }

        if(action_type === 'accept'){
            connect.status_accepted = true
        }else{
            connect.status_accepted = false
        }

        await connect.save()

        await invalidateConnectionCaches(token)
        await invalidateConnectionCachesByUserIds([connect.userId, connect.connectionId])

        return res.json({message:"req updated"})

     }catch(err){
        return res.json({message:err.message})
    }
}

export const getProfileBasedOnUsername = async(req,res) =>{
    const {username} = req.query
    try{

        const user = await User.findOne({username:username})

        if(!user){
            return res.status(400).json({message:"username not found"})
        }

        const userProfile = await Profile.findOne({userId:user._id}).populate('userId', 'name username email profilePicture')

        return res.json({'profile':userProfile})

    }catch(err){
        return res.json({message:err.message})
    }
}