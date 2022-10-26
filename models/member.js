import mongoose from "mongoose";
import MessageModel from '../models/message.js';
import RoomModel from '../models/room.js';
import UserModel from '../models/user.js';

const MAX_ROOM_MEMBER = 64


const memberSchema = new mongoose.Schema(
    {
        roomId: String,
        userId: String,
        role: String,
        notifications:
        {
            type: Boolean,
            default: true
        },
        numberNotifications: {
            type: Number,
            default: 0
        },
    },
    {
        versionKey: false,
        timestamps: true,
        collection: "members", // Name of member DB
    }
);

/**
 * function to add notification to user in room
 * @param {*} roomId id of the room in question
 * @param {*} userId id of the user in question
 * @returns user in question
 */
memberSchema.statics.addNotification = async function (roomId, userId, tagIds) {
    try {
        // Check if the user is indeed in the room
        const notified = await this.findOne({ 'roomId': roomId, 'userId': userId });
        if (!notified) throw ({ error: 'User not in the room' });
        let tagged = tagIds ? tagIds.include(notified.userId) : false
        if (notified.notifications || tagged) {
            console.log("NOTIFICATION : " + notified.userId + " a été notifié d'un message")
            notified.numberNotifications += 1;
            notified.save();
        }

        return notified;
    } catch (error) {
        throw ({ error: "Can't add notification" });
    }
}

/**
 * function to add user to a room
 * @param {*} roomId id of the room in question
 * @param {*} userId id of the user in question
 * @param {*} role role of the user "admin" or null
 * @returns new member created
 */
memberSchema.statics.addMember = async function (roomId, userId, role) {
    try {

        // Check if user and room exists
        const room = await RoomModel.getRoomById(roomId)
        const user = await UserModel.getUserById(userId)

        const members = await this.countUsersInRoom(roomId);
        if (members >= MAX_ROOM_MEMBER) throw ({ error: 'More than ' + MAX_ROOM_MEMBER + ' users in the room' });

        // Check if the user is already in the room
        const checkIfExists = await this.findOne({ 'roomId': roomId, 'userId': userId });
        if (checkIfExists) throw ({ error: 'User already in the room' });

        const member = await this.create({ roomId, userId, role });

        // Bot message of user joining room
        if (room.type === "group")
            return member;
    } catch (error) {
        console.log("Error when adding a member");
        throw error;
    }
}

/**
 * function to add user to a room with a url
 * @param {*} userId id of the user in question
 * @param {*} url url link
 * @returns new member created
 */
memberSchema.statics.addMemberWithURL = async function (userId, url) {
    try {
        // Check if user exists
        const user = await UserModel.getUserById(userId);
        const room = await RoomModel.getRoomByURL(url);

        const members = await this.countUsersInRoom(room._id);
        if (members >= MAX_ROOM_MEMBER) throw ({ error: 'More than ' + MAX_ROOM_MEMBER + ' users in the room' });

        // Check if the user is already in the room
        const checkIfExists = await this.findOne({ 'roomId': room._id, 'userId': userId })
        if (checkIfExists) throw ({ room: checkIfExists, error: 'User already in the room' });

        const member = await this.create({ roomId: room._id, userId, role: null });
        await MessageModel.createBotPost(room._id, " a rejoint le groupe.", userId);

        return room;
    } catch (error) {
        console.log("Error when adding a member via URL");
        throw error;
    }
}

/**
 * function to count number of user in room
 * @param {*} roomId id of the room in question
 * @returns number of user counted
 */
memberSchema.statics.countUsersInRoom = async function (roomId) {
    try {
        const number = await this.count({ roomId: roomId });
        return number;
    } catch (error) {
        throw error;
    }
}

/**
 * function to get all member elements
* @return {Array} List of all members
*/
memberSchema.statics.getMembers = async function () {
    try {
        const members = await this.find();
        return members;
    } catch (error) {
        throw error;
    }
}

/**
 * function to get all membership of a user
 * @param {*} userId id of the user in question
 * @returns membership of user
 */
memberSchema.statics.getRoomsOfUser = async function (userId) {
    try {
        const members = await this.find({ userId: userId });
        if (!members) throw ({ error: 'No room with this user' });

        return members;
    } catch (error) {
        throw error;
    }
}

/**
 * function to get all users in a room
 * @param {*} roomId id of the room in question
 * @returns members in the room
 */
memberSchema.statics.getUsersInRoom = async function (roomId) {
    try {
        const members = await this.find({ roomId: roomId });
        if (!members) throw ({ error: 'No user in this room' });

        return members;
    } catch (error) {
        throw error;
    }
}

/**
 * function to remove a user as member of a groupchat when admin kicks it out
 * @param {*} roomId id of the room in question
 * @param {*} userId id of the user to remove
 * @returns string message
 */
memberSchema.statics.kickMember = async function (roomId, userId, adminId) {
    try {
        // Check if user and room exists
        const room = await RoomModel.getRoomById(roomId);
        const user = await UserModel.getUserById(userId);
        const admin = await UserModel.getUserById(adminId);

        // Check if room is a groupchat
        if (room.type != "group") throw ({ error: 'Can only kick out of groupchat' });

        // Check if the user is indeed in the room
        const checkIfExists = await this.findOne({ 'roomId': roomId, 'userId': userId })
        if (!checkIfExists) throw ({ error: 'User not in the room' });

        if (room.adminId != admin._id) throw ({ error: "User is not admin of the room" });

        // Delete member (can't auto kick admin)
        if (admin._id != user._id) {
            await this.deleteOne({ 'roomId': roomId, 'userId': userId });
            await MessageModel.createBotPost(roomId, " a été exclu(e) du groupe.", userId);
            console.log("NOTIFICATION : " + userId + " a été exclu d'un groupe")

            return (user._id + " kicked out of room " + room._id);
        } else {
            throw ({ error: "Admin can't kick itself" });
        }
    } catch (error) {
        console.log("Error when kicking a member")
        throw error;
    }
}

/**
 * function to remove user as member when he wants to leave room
 * @param {*} roomId id of the room in question
 * @param {*} userId id of the user in question
 * @returns string message
 */
memberSchema.statics.leaveRoom = async function (roomId, userId) {
    try {
        // Check if user and room exists
        const room = await RoomModel.getRoomById(roomId);
        const user = await UserModel.getUserById(userId);

        // Check if room is a groupchat
        if (room.type != "group") throw ({ error: 'Can only leave a groupchat' });

        // Check if the user is indeed in the room
        const checkIfExists = await this.findOne({ 'roomId': roomId, 'userId': userId });
        if (!checkIfExists) throw ({ error: 'User not in the room' });

        // Delete member
        await this.deleteOne({ 'roomId': roomId, 'userId': userId });
        await MessageModel.createBotPost(roomId, " a quitté le groupe.", userId);
        console.log("NOTIFICATION : " + userId + " a quitté un groupe")

        if (room.adminId == userId) {
            // Cas où l'admin quitte le groupe, on en choisit un autre
            const newAdmin = await this.findOne({ roomId }).sort({ createdAt: 1 }).limit(1);
            if (!newAdmin) return "No more member of the group";
            newAdmin.role = "admin";
            newAdmin.save();

            room.adminId = newAdmin.userId;
            room.save();

            await MessageModel.createBotPost(roomId, " a été promu(e) administrateur du groupe.", newAdmin.userId);

            return ("Admin left the room, " + newAdmin.userId + " is the new admin");
        }
        return (user._id + "left room " + room._id);

    } catch (error) {
        console.log("Error when leaving the group");
        throw error;
    }
}

/**
 * function to set to zero the number of notifications of a user in a room
 * @param {*} roomId id of the room in question
 * @param {*} userId id of the user in question
 * @returns user in question
 */
memberSchema.statics.markAsRead = async function (roomId, userId) {
    try {
        // Check if user and room exists
        const room = await RoomModel.getRoomById(roomId);
        const user = await UserModel.getUserById(userId);

        // Check if the user is indeed in the room
        const checkIfExists = await this.findOne({ 'roomId': room._id, 'userId': user._id });
        if (!checkIfExists) throw ({ error: 'User not in the room' });

        checkIfExists.numberNotifications = 0;
        checkIfExists.save();

        return checkIfExists;
    } catch (error) {
        throw ({ error: "Can't mark as read" });
    }
}

/**
 * function to turn on or off the notifications of a user in a room
 * @param {*} roomId id of the room in question
 * @param {*} userId id of the user in question
 * @param {*} onOrOff boolean to have notification or not
 * @returns user in question
 */
memberSchema.statics.setNotification = async function (roomId, userId, onOrOff) {
    try {
        // Check if user and room exists
        const room = await RoomModel.getRoomById(roomId);
        const user = await UserModel.getUserById(userId);

        // Check if the user is indeed in the room
        const checkIfExists = await this.findOne({ 'roomId': room._id, 'userId': user._id });
        if (!checkIfExists) throw ({ error: 'User not in the room' });

        checkIfExists.notifications = onOrOff;
        checkIfExists.save();

        return checkIfExists;
    } catch (error) {
        throw ({ error: "Can't set notification on or off" });
    }
}

export default mongoose.model("member", memberSchema);
