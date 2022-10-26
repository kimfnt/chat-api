import mongoose from "mongoose";
import { v4 as uuidv4 } from "uuid";
import MemberModel from '../models/member.js';
import RoomModel from '../models/room.js';


const messageSchema = new mongoose.Schema(
    {
        _id: {
            type: String,
            default: () => uuidv4().replace(/\-/g, ""),
        },
        type: String,
        //-1 : Message supprimé en attente de suppression totale
        // 0 : Message utilisateur
        // 1 : Message bot (join/quit)
        // 2 : image
        // 3 : video
        // 4 : audio
        userId: String,
        roomId: String,
        message: String,
        parentId: String,
        URL: String, //  URL S3 AWS
        tagIds: [{
            type: String
        }]
    },
    {
        versionKey: false,
        timestamps: true,
        collection: "messages",
    }
);


/**
 * function to create a post message into a room
 * @param {String} roomId id of the room in question
 * @param {String} messagePayload text message to send
 * @param {String} currentLoggedUser id of the sender of the message 
 * @param {Array} tagIds array of ids of people tagged in the message
 * @param {String} parentId id of the message we reply to
 * @param {String} URL url oft the media sent
 * @param {String} type type of the message
 * @returns message created
 */
messageSchema.statics.createPostInRoom = async function (roomId, messagePayload, currentLoggedUser, tagIds, parentId, URL, type) {
    try {
        if (typeof type == "undefined") {
            type = "0"
        }
        const message = this.create({
            type: type,
            userId: currentLoggedUser,
            roomId: roomId,
            parentId: parentId,
            message: messagePayload,
            URL: URL,
            tagIds: tagIds
        });

        const members = await MemberModel.getUsersInRoom(roomId)

        // We want to notified everyone that has notifications on, or that is tagged, and not the sender
        members.forEach(async (member) => {
            if (member.userId != currentLoggedUser) await MemberModel.addNotification(roomId, member.userId, tagIds);
        });

        return message;
    }
    catch (error) {
        throw error;
    }
}

/**
 * fucntion to create a bot message in a room
 * @param {String} roomId id of the room in question
 * @param {String} messagePayload text message 
 * @returns bot message created
 */
messageSchema.statics.createBotPost = async function (roomId, messagePayload, userId) {
    try {
        await RoomModel.findByIdAndUpdate({ _id: roomId }, { updatedAt: new Date() });
        const message = this.create({
            type: "1",
            userId: userId,
            roomId: roomId,
            message: messagePayload
        });

        const members = await MemberModel.getUsersInRoom(roomId)
        members.forEach(async (member) => {
            await MemberModel.addNotification(roomId, member.userId, null);
        });

        return message;
    }
    catch (error) {
        throw error;
    }
}

/**
 * function to get message by its id
 * @param {String} messageId id of the message we're looking for
 * @returns the message
 */
messageSchema.statics.getMessageId = async function (messageId) {
    try {
        const message = await this.find({ _id: messageId })

        return message

    } catch (error) {
        throw error
    }
}

/**
 * function to get all messages sent by a user
 * @param {String} userId id of the user
 * @returns all the messages found
 */
messageSchema.statics.getAllMessagesFromUserId = async function (userId) {
    try {
        const messages = await this.find({ userId: userId }).sort({ createdAt: -1 });

        return messages;
    }
    catch (error) {
        throw error;
    }
}

/**
 * function to get all messages sent in a room
 * @param {String} roomId id of the room
 * @returns all messages found in the room
 */
messageSchema.statics.getAllMessagesFromRoomId = async function (roomId) {
    try {
        const room = await RoomModel.getRoomById(roomId)
        const messages = await this.find({ roomId: roomId }).sort({ createdAt: -1 });

        return messages;
    }
    catch (error) {
        throw error;
    }
}

/**
 * function to get all messages sent by a user in a room
 * @param {String} roomId id of the room
 * @param {String} userId id of the user
 * @returns all the messages found
 */
messageSchema.statics.getAllMyMessagesFromRoomId = async function (roomId, userId) {
    try {
        const room = await RoomModel.getRoomById(roomId)
        const messages = await this.find({ roomId: roomId, userId: userId })
        return messages

    } catch (error) {
        throw error
    }
}

/**
 * function to get the last x messages in a room 
 * @param {String} roomId id of the room
 * @param {Int} limit number of message to return
 * @returns the messages
 */
messageSchema.statics.getRecentMessagesFromRoomId = async function (roomId, limit) {
    try {
        const room = await RoomModel.getRoomById(roomId)
        const messages = await this.find({ roomId: roomId }).sort({ createdAt: -1 }).limit(limit);

        return messages;
    }
    catch (error) {
        throw error;
    }
}

/**
 * function to get the x messages from a certain page
 * @param {String} roomId id of the room
 * @param {Int} limit number of messages to return
 * @param {Int} page page number
 * @returns 
 */
messageSchema.statics.getRefreshMessagesFromRoomId = async function (roomId, limit, page) {
    try {
        const room = await RoomModel.getRoomById(roomId)
        const messages = await this.find({ roomId: roomIdn })
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit);

        return messages;
    }
    catch (error) {
        throw error;
    }
}

/**
 * function to get the last message sent in a room
 * @param {String} RoomId id of the room
 * @returns the message
 */
messageSchema.statics.getLastMessageFromRoomId = async function (RoomId) {
    try {
        const room = await RoomModel.getRoomById(RoomId)
        const message = await this.find({ roomId: RoomId }).sort({ createdAt: -1 }).limit(1);
        return message
    }
    catch (error) {
        throw error
    }
}

/**
 * function to change the type of the message 
 * @param {String} userId id of the sender
 * @param {String} messageId id of the message
 * @param {String} type new type to fix
 * @returns the message
 */
messageSchema.statics.changeMessageType = async function (userId, messageId, type) {
    try {
        const messageToChange = await this.findOne({ _id: messageId, userId: userId })
        if (!messageToChange) throw ({ error: `No message of id ${roomId} found` });

        messageToChange.type = type
        await messageToChange.save()

        return messageToChange
    } catch (error) {
        throw error
    }
}

/**
 * function to permanently delete all messages with the type -1 in the database once the gdpr
 * limit has passed 
 * @param {Int} duration gdpr limit to fix in days
 * @returns String to indicate the end of the process
 */
messageSchema.statics.updateDeletedMessages = async function (duration) {
    try {

        const currentDate = new Date()

        const deletedMessages = await this.find({ type: -1 })


        for (let j = deletedMessages.length - 1; j > -1; j--) {

            const difference = currentDate - deletedMessages[j].updatedAt

            const jours = difference / 86400000 // Nombre de millisecondes dans une journée

            if (jours > duration) { // Condition RGPD , 6 mois ~ 183 jours
                const message = await this.deleteOne({ _id: deletedMessages[j]._id })
            }
        }

        return 'Script terminé'


    } catch (error) {
        throw error
    }
}


export default mongoose.model("message", messageSchema);
