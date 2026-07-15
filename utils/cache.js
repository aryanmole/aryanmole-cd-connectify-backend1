import redisClient from '../config/redis.js'   //middleware of redis

const DEFAULT_TTL = parseInt(process.env.REDIS_TTL || '300', 10)

export const CACHE_KEYS = {
    userProfile: (token) => `user:profile:${token}`,
    allUsers: 'users:all',
    sentConnections: (token) => `connections:sent:${token}`,
    receivedConnections: (token) => `connections:received:${token}`,
}

export const isRedisReady = () => redisClient.isOpen && redisClient.isReady  //is redis is crashed it uses mongodb

export async function getCached(key) {   //Redis stores strings
    if (!isRedisReady()) return null

    try {
        const data = await redisClient.get(key)
        return data ? JSON.parse(data) : null
    } catch (err) {
        console.warn('Redis get error:', err.message)
        return null
    }
}

export async function setCached(key, value, ttl = DEFAULT_TTL) {  //Redis deletes it automatically after 300sec. 
    if (!isRedisReady()) return

    try {
        await redisClient.setEx(key, ttl, JSON.stringify(value))
    } catch (err) {
        console.warn('Redis set error:', err.message)
    }
}

export async function deleteCached(...keys) {    //when data is updated in mongodb redis deletes it
    if (!isRedisReady() || keys.length === 0) return

    try {
        await redisClient.del(keys)
    } catch (err) {
        console.warn('Redis delete error:', err.message)
    }
}
