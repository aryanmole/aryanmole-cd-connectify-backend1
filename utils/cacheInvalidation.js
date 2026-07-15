//Whenever MongoDB data changes, delete the old Redis cache so the next GET request fetches fresh data from MongoDB and stores it in Redis again.

import User from '../models/user.model.js'
import { CACHE_KEYS, deleteCached } from './cache.js'

export async function invalidateUserProfile(token) { //when user updates their profile redis deletes data
    if (!token) return
    await deleteCached(CACHE_KEYS.userProfile(token))
}

export async function invalidateAllUsers() { //new user is added
    await deleteCached(CACHE_KEYS.allUsers)
}

export async function invalidateUserCaches(token) {
    if (!token) return
    await deleteCached(
        CACHE_KEYS.userProfile(token),
        CACHE_KEYS.sentConnections(token),
        CACHE_KEYS.receivedConnections(token)
    )
}

export async function invalidateConnectionCaches(token) {  //req. sent then redis deletes data
    if (!token) return
    await deleteCached(
        CACHE_KEYS.sentConnections(token),
        CACHE_KEYS.receivedConnections(token)
    )
}

export async function invalidateConnectionCachesByUserIds(userIds) {
    const ids = [...new Set(userIds.filter(Boolean).map(String))]
    if (ids.length === 0) return

    const users = await User.find({ _id: { $in: ids } }).select('token')
    const tokens = users.map((user) => user.token).filter(Boolean)

    await Promise.all(tokens.map((token) => invalidateConnectionCaches(token)))
}
