import cjs from "crypto-js";
import mongoose from "mongoose";
import { v4 as uuidv4 } from "uuid";
import MemberModel from '../models/member.js';
import MessageModel from '../models/message.js';
import RoomModel from '../models/room.js';


const userSchema = new mongoose.Schema(
  {
    _id: {
      type: String,
      default: () => uuidv4().replace(/\-/g, ""),
    },
    name:
    {
      type: String,
      default: "NoName"
    },
    token:
    {
      type: String,
      default: () => uuidv4().replace(/\-/g, ""),
    },
  },
  {
    versionKey: false,
    timestamps: true,
    collection: "users", // Name of member DB
  },

);

/**
 * function to create user
 * @param {String} firstName
 * @returns {Object} new user object created
 */
userSchema.statics.createUser = async function (name) {
  try {
    const user = await this.create({ name, 'token': cjs.MD5(name) });
    return user;
  } catch (error) {
    throw error;
  }
}


/**
 * function to get user with its id
 * @param {String} id, user id
 * @return {Object} User profile object
 */
userSchema.statics.getUserById = async function (id) {
  try {
    const user = await this.findOne({ _id: id });
    if (!user) throw ({ error: `No user of id ${id} found` });
    return user;
  } catch (error) {
    throw error;
  }
}

/**
 * WARNING: ONLY APPLICABLE TO 1ON1 ROOMS
 * function to return the other user in the 1on1 room
 * @param {String} roomId id of the room
 * @param {String} userId id of the current user
 * @returns {Object} the other user
 */
userSchema.statics.getOtherUserOfRoom = async function (roomId, userId) {
  try {
    var user
    const room = RoomModel.getRoomById(roomId)
    if (room.type == "group") throw ({ error: `Room of id ${id} is not a 1on1 room` });
    else {
      const members = await MemberModel.getUsersInRoom(roomId);
      if (members[0].userId == userId) user = this.getUserById(members[1].userId);
      else user = this.getUserById(members[0].userId);
    }
    return user;
  } catch (error) {
    throw error;
  }
}

/**
 * function to get user with its id and token
 * @param {String} id, user id
 * @param {String} token, user token
 * @return {Object} User profile object
 */
userSchema.statics.getUserByIdAndToken = async function (id, token) {
  try {
    const user = await this.findOne({ _id: id, token });
    if (!user) throw ({ error: 'No user with this id and token found' });
    return user;
  } catch (error) {
    throw error;
  }
}

/**
 * function to get all users
 * @return {Array} List of all users
 */
userSchema.statics.getUsers = async function () {
  try {
    const users = await this.find();
    return users;
  } catch (error) {
    throw error;
  }
}

/**
 * function to get users with an array of ids
 * @param {Array} ids, string of user ids
 * @return {Array of Objects} users list
 */
userSchema.statics.getUserByIds = async function (ids) {
  try {
    const users = await this.find({ _id: { $in: ids } });
    return users;
  } catch (error) {
    throw error;
  }
}

/**
 * function to delete user with its id
 * @param {String} id - id of user
 * @return {Object} - details of action performed
 */
userSchema.statics.deleteByUserById = async function (id) {
  try {
    const result = await this.remove({ _id: id });
    return result;
  } catch (error) {
    throw error;
  }
}

/**
 * function to get the last message from all rooms of user
 * @param {*} userId id of the user in question
 * @returns messages (newest to oldest)
 */
userSchema.statics.getLastMessageFromAllRoom = async function (userId) {
  try {
    var messages = [];
    const rooms = await MemberModel.getRoomsOfUser(userId);
    for (const room of rooms) {
      const message = await MessageModel.getLastMessageFromRoomId(room.roomId);
      if (typeof message[0] !== 'undefined') {
        messages.push(message[0]);
      }
    }
    // sort from newest to oldest
    messages.sort((a, b) => b.createdAt - a.createdAt);

    return messages;
  } catch (error) {
    throw error;
  }
}

/**
 * function to return all the user objects in a room
 * @param {String} userId - id of room
 * @return {Array} array of all users that belong to the room
 */
userSchema.statics.getUsersByRoomId = async function (roomId) {
  try {
    const members = await MemberModel.getUsersInRoom(roomId);
    let result = members.map(({ userId }) => userId)

    const rooms = await this.find({ '_id': { $in: result } }).sort('-updatedAt');

    return rooms;
  } catch (error) {
    throw error;
  }
}

export default mongoose.model("User", userSchema);
