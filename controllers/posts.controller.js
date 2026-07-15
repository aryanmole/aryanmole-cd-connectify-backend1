import comment from '../models/comments.model.js'
import Post from '../models/posts.models.js'
import Profile from '../models/profile.model.js'
import User from '../models/user.model.js'
import bcrypt from 'bcrypt'
import fs from 'fs/promises'
import path from 'path'

export const activeCheck = async(req,res)=>{
    return res.status(200).json({message:"Running"})
}

export const createPost = async(req,res)=>{
    const {token} = req.body

    try{
        const user = await User.findOne({token:token})

        if(!user){
            // Multer may have already written the file to disk.
            // Clean it up so we don't keep orphan uploads when auth fails.
            if (req.file?.filename) {
                try {
                    await fs.unlink(path.join("uploads", req.file.filename))
                } catch (_) {
                    // ignore cleanup errors
                }
            }
            return res.status(404).json({message:"user not found"})
        }

        const post = new Post({
            userId:user._id,
            body:req.body.body, //stores the text content of the post sent by user eg "body": "This is my first post"
            media:req.file != undefined ? req.file.filename : "", // if user uploads file eg photo.jpg store its filename if user does npt upload photo keep string
            fileType:req.file != undefined ? req.file.mimetype.split("/")[1] : "" //mimetype tells what type of file was uploaded if uploaded photo.jpg split them to ["image", "png"]
        })

        await post.save()

        return res.status(200).json({message:"post created", post})
    }catch(err){
        // If validation fails after a file upload, cleanup the file as well.
        if (req.file?.filename) {
            try {
                await fs.unlink(path.join("uploads", req.file.filename))
            } catch (_) {
                // ignore cleanup errors
            }
        }
        return res.json({message:err.message})
    }
}

export const getAllPost = async(req,res)=>{
    

    try{
        let { page = 1, limit = 10 } = req.query;

        page = parseInt(page);
        limit = parseInt(limit);

        const skip = (page - 1) * limit;

        const totalPosts = await Post.countDocuments();

        const posts = await Post.find()
            .populate("userId", "name username email profilePicture")
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        return res.json({
            currentPage: page,
            totalPages: Math.ceil(totalPosts / limit),
            totalPosts,
            posts
        });

        //this is home page where we see every users posts so no token req
    }catch(err){
        return res.json({message:err.message})
    }
}

export const deletePost = async(req,res)=>{
    
    const {token,post_id} =req.body
    try{
        const user = await User.findOne({token:token}).select(("_id"))

        if(!user){
             return res.status(404).json({message:"user not found"})
        }
        const post = await Post.findOne({_id:post_id})

        if(!post){
             return res.status(404).json({message:"no post found to delete"})
        }

        if(post.userId.toString() !== user._id.toString()){
            return res.status(401).json({message:"Unauthorised"})
        } // suppose aryan can deleted tapan's post with his id so this condition is used 

        await Post.deleteOne({_id:post_id})

        return res.json({message:"post deleted"})

        //this is home page where we see every users posts so no token req
    }catch(err){
        return res.json({message:err.message})
    }
}

export const commentPost = async(req,res)=>{
    const {token,post_id,comm} = req.body
    try{
        const user = await User.findOne({token:token}).select(("_id")) //when we want userId we use .select(("_id")

        if(!user){
             return res.status(404).json({message:"user not found"})
        }

        const post = await Post.findOne({_id:post_id})

        if(!post){
             return res.status(404).json({message:"no post found to delete"})
        }

        const commen = new comment({
            userId:user._id,
            postId:post_id,
            body:comm
        })

        await commen.save()

        return res.status(200).json({message:"comment sent"})

    }catch(err){
         return res.json({message:err.message})
    }
}

export const get_comments_by_post = async(req,res)=>{
    const {post_id} =req.query // query is used for GET req

    try{
        const post = await Post.findOne({_id:post_id})

        if(!post){
              return res.status(404).json({message:"post not found"})
        }

        const comments = await comment.find({postId:post_id}).populate("userId","username name profilePicture") 

        return res.json(comments.reverse()) //to get newest comment on top

    }catch(err){
         return res.json({message:err.message})
    }
}


export const delete_comment_of_user = async(req,res)=>{
    const {comment_id,token} =req.body

    try{
        const user = await User.findOne({token:token}).select(("_id")) //when we want userId we use .select(("_id")

        if(!user){
             return res.status(404).json({message:"user not found"})
        }

        const commen = await comment.findOne({_id:comment_id})

        if(!commen){
              return res.status(404).json({message:"comment not found"})
        }

         if(commen.userId.toString() !== user._id.toString()){
            return res.status(401).json({message:"Unauthorised"})
        }

        await comment.deleteOne({_id:comment_id})
        return res.json({message:"comment deleted"})

    }catch(err){
         return res.json({message:err.message})
    }
}


export const increment_likes = async(req,res)=>{
    const {post_id} =req.body
    
    try{
    
        const post = await Post.findOne({_id:post_id})

        if(!post){
              return res.status(404).json({message:"post not found"})
        }

        post.likes += 1
        
        await post.save()

        return res.json({message:"Like incremented"})
        
    }catch(err){
         return res.json({message:err.message})
    }
}