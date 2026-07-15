import { createClient } from 'redis' //Redis's client library

const redisClient = createClient({               //This creates a Redis client
    url: process.env.REDIS_URL || 'redis://127.0.0.1:6379'
})

redisClient.on('error', (err) => {
    console.error('Redis Client Error:', err.message)
})

export const connectRedis = async () => {   //just like localhost server is listening on port 3000 redis is running it's port on 6379
    if (redisClient.isOpen) return redisClient

    try {
        await redisClient.connect()
        console.log('Redis Connected')
    } catch (err) {
        console.warn('Redis unavailable, running without cache:', err.message)
    }

    return redisClient
}

export default redisClient
