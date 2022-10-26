import cjs from "crypto-js";
import mongoose from "mongoose";
import { nanoid } from "nanoid";
import { v4 as uuidv4 } from "uuid";

import MemberModel from '../models/member.js';
import MessageModel from '../models/message.js';
import UserModel from '../models/user.js';

const TTL_JOIN_LINK = 14; // Jours après lesquels un lien expire

const roomSchema = new mongoose.Schema(
    {
        _id: {
            type: String,
            default: () => uuidv4().replace(/\-/g, ""),
        },
        type: String,
        adminId: String,
        status: {
            type: String,
            default: "active",
        },
        name: {
            type: String,
            default: null
        },
        key:
        {
            type: String,
            default: () => nanoid(32)

        },
        url: String,
        urlMaxDate: Date
    },
    {
        versionKey: false,
        timestamps: true,
        collection: "rooms", // Name of room
    }
);


/**
 * function to get rooms of user
 * @param {String} userId - id of user
 * @return {Array} array of all rooms that the user belongs to
 */
roomSchema.statics.getRoomsByUserId = async function (userId) {
    try {
        const members = await MemberModel.getRoomsOfUser(userId);
        let result = members.map(({ roomId }) => roomId);

        const rooms = await this.find({ '_id': { $in: result } }).sort('-updatedAt');

        return rooms;
    } catch (error) {
        throw error;
    }
}


/**
 * function to get room by its id
 * @param {String} roomId - id of room
 * @return {Object} room
 */
roomSchema.statics.getRoomById = async function (roomId) {
    try {
        const room = await this.findOne({ _id: roomId });
        if (!room) throw ({ error: `No room of id ${roomId} found` });
        return room;
    } catch (error) {
        throw error;
    }
}

/**
 * function to get room by its url
 * @param {String} url url link to the room
 * @returns room
 */
roomSchema.statics.getRoomByURL = async function (url) {
    try {
        // And check if TTL hasn't expired !
        const room = await this.findOne({ url: url });
        if (!room) throw ({ error: `No room of url ${url} found` });

        var date = new Date();
        if (date > room.urlMaxDate) throw ({ error: `URL has expired. Create a new one.` });

        return room;
    } catch (error) {
        throw error;
    }
}



/**
 * function to know if 1 on 1 room exists
 * @param {String} creatorId - user who created the room, will be admin
 * @param {String} invitedId - user who is invited
 * @returns room if exists
 */
roomSchema.statics.checkIf1On1Exists = async function (creatorId, invitedId) {
    try {
        const inv = await UserModel.getUserById(invitedId);
        const cre = await UserModel.getUserById(creatorId);
        const creatorRooms = await this.getRoomsByUserId(creatorId);
        const invitedRooms = await this.getRoomsByUserId(invitedId);

        const commonRoom = creatorRooms.filter((room1) => room1.type === '1on1' && invitedRooms.find(room2 => room1._id === room2._id));

        if (commonRoom.length) return commonRoom[0];
        else return null;
    }
    catch (error) {
        console.log('error on search 1on1 method', error);
        throw error
    }
}

/**
 * function to create 1 on 1 room
 * @param {String} type - type of room created (here "1on1")
 * @param {String} creatorId - user who created the room
 * @param {String} invitedId - user who is invited to the room
 * @returns 1 on 1 room created
 */
roomSchema.statics.initiate1On1 = async function (type, creatorId, invitedId) {
    try {
        const checkIf1On1Exists = await this.checkIf1On1Exists(creatorId, invitedId)
        if (!checkIf1On1Exists) {
            const newRoom = await this.create({ type });
            // Add both of the user as member of the rooms
            await MemberModel.addMember(newRoom._doc._id, creatorId, null)
            await MemberModel.addMember(newRoom._doc._id, invitedId, null)
            await MessageModel.createBotPost(newRoom._id, " a créé le conversation.", creatorId);

            return newRoom
        }
        else {
            throw ({ error: `1 On 1 room already exists`, room: checkIf1On1Exists });
        }
    } catch (error) {
        throw error
    }
}

/**
 * function to create group chat
 * @param {String} type - type of room created (here "group")
 * @param {String} adminId - user who created the room and becomes admin
 * @param {String} name - name of the group chat
 * @returns group chat created
 */
roomSchema.statics.initiateGroupChat = async function (type, adminId, name) {
    try {
        const newRoom = await this.create({ type, adminId, name });

        // Add the admin to members DB with the roomId as its room, obviously
        const admin = await MemberModel.addMember(newRoom._id, adminId, "admin");

        await MessageModel.createBotPost(newRoom._id, " a créé une conversation de groupe.", adminId);
        return newRoom;
    } catch (error) {
        console.log('error on create group method', error);
        throw error;
    }
}

/**
 * function to modify name of the group chat
 * @param {String} newName the new name of the room
 * @param {String} roomId id of the room in question
 * @param {String} userId id of the user making the change
 * @returns the room
 */
roomSchema.statics.modifyName = async function (newName, roomId, userId) {
    try {
        // Check if user is admin first
        const newRoom = await this.isAdmin(userId, roomId);

        newRoom.name = newName;
        await newRoom.save();

        await MessageModel.createBotPost(roomId, ' a modifié le nom du groupe pour "' + newName, userId);


        return newRoom;
    } catch (error) {
        console.log('error on change group name method', error);
        throw error;
    }
}

/**
 * function to determine if user is admin of the room or not
 * @param {String} roomId id of the room in question
 * @param {String} userId id of the user in question
 * @returns the room
 */
roomSchema.statics.isAdmin = async function (userId, roomId) {
    try {
        const room = await this.getRoomById(roomId);

        // Error if the user is not admin
        if (room.adminId != userId) return null

        return room;
    } catch (error) {
        throw error;
    }
}

/**
 * function to generate a url for the group chat
 * @param {String} roomId id of the room in question
 * @returns the room
 */
roomSchema.statics.generateURL = async function (roomId, date) {
    try {
        const room = await this.getRoomById(roomId);
        if (room.type != "group") throw ({ error: `This room is not a groupchat` });

        // Add the time to live of the URL
        var now = new Date();
        var url = cjs.MD5(roomId + now);
        if (date == "default") now.setDate(now.getDate() + TTL_JOIN_LINK);
        else now = new Date(date);
        room.urlMaxDate = now;
        room.url = url.toString();
        room.save();

        return room;

    } catch (error) {
        console.log('error generating url', error);
        throw error;
    }
}

/**
 * function to search for a room by its name
 * @param {String} name name of the room to find
 * @param {Int} limit number of rooms to return (optional)
 * @param {Int} page page number (optional)
 * @returns the rooms that contains the regex in the name
 */
roomSchema.statics.getRoomsByName = async function (name, limit, page) {
    try {
        let rooms;
        let count;

        const roomsOfUser = await this.getRoomsByUserId(userId)

        if (typeof limit != "undefined" && typeof page == "undefined") {
            rooms = await this.find({ name: { $regex: name, $options: "i" }, '_id': { $in: roomsOfUser } })
                .sort('-updatedAt')
                .limit(limit);

            count = await this.countDocuments({ name: { $regex: name, $options: "i" }, '_id': { $in: roomsOfUser } });

            return ({
                rooms,
                totalRooms: count
            });

        } else if (typeof limit != "undefined" && typeof page != "undefined") {

            rooms = await this.find({ name: { $regex: name, $options: "i" }, '_id': { $in: roomsOfUser } })
                .sort('-updatedAt')
                .skip((page - 1) * limit)
                .limit(limit);


            count = await this.countDocuments({ name: { $regex: name, $options: "i" }, '_id': { $in: roomsOfUser } });

            return ({
                rooms,
                totalRooms: count,
                totalPages: Math.ceil(count / limit),
                currentPage: page
            });

        } else {

            rooms = await this.find({ name: { $regex: name, $options: "i" }, '_id': { $in: roomsOfUser } })
                .sort('-updatedAt');

            count = await this.countDocuments({ name: { $regex: name, $options: "i" }, '_id': { $in: roomsOfUser } });

            return ({
                rooms,
                totalRooms: count
            });
        }

    } catch (error) {
        console.log("error while searching for rooms with this name");
        throw error;
    }
}

export default mongoose.model("room", roomSchema);
