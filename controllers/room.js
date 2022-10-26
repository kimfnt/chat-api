// models
import MemberModel from '../models/member.js';
import MessageModel from '../models/message.js';
import RoomModel from '../models/room.js';

export default {

  onGetRoomById: async (req, res) => {
    // #swagger.tags = ['rooms']
    // #swagger.summary = "Get info about a specific room"
    // #swagger.responses[200] = {description: "Room found"}
    // #swagger.responses[404] = {description: "No room found with this id"}
    try {
      const roomId = req.params.roomId;
      const room = await RoomModel.getRoomById(roomId);
      return res.status(200).json({
        success: true, room
      });
    } catch (error) {
      return res.status(404).json({ success: false, error });
    }
  },

  onGenerateURL: async (req, res) => {
    // #swagger.tags = ['rooms']
    // #swagger.summary = "Generate the URL of the room"
    // #swagger.responses[201] = {description: "URL created with success"}
    // #swagger.responses[500] = {description: "Error while creating the URL"}
    try {
      const roomId = req.body.roomId;
      const date = req.body.date;
      const room = await RoomModel.generateURL(roomId, date);

      return res.status(201).json({ success: true, room });

    } catch (error) {
      return res.status(500).json({ success: false, error: error });
    }
  },

  onGetMessagesFromRoomId: async (req, res) => {
    // #swagger.tags = ['rooms']
    // #swagger.summary = "Get the last messages from a specific room by its id"
    // #swagger.responses[200] = {description: "Messages in the room found"}
    // #swagger.responses[500] = {description: "Error while retrieving the messages in the room"}
    try {
      const { roomId } = req.params;
      const { limit } = req.query;
      const { page } = req.query;
      if (typeof limit != 'undefined' && typeof page != 'undefined') {
        const result = await MessageModel.getRefreshMessagesFromRoomId(roomId, limit, page)
        return res.status(200).json({ success: true, result });
      } else if (typeof limit != 'undefined' && typeof page == 'undefined') {
        const result = await MessageModel.getRecentMessagesFromRoomId(roomId, limit)
        return res.status(200).json({ success: true, result });
      } else if (typeof limit == 'undefined') {
        const result = await MessageModel.getAllMessagesFromRoomId(roomId)
        return res.status(200).json({ success: true, result });
      }
    } catch (error) {
      console.log(error);
      return res.status(500).json({ success: false, error });
    }
  },

  onGetMessageById: async (req, res) => {
    // #swagger.tags = ['rooms']
    // #swagger.summary = "Get a specific message with its id"
    // #swagger.responses[200] = {description: "Message found with id"}
    // #swagger.responses[404] = {description: "Unable to find the message"}
    try {
      const messageId = req.params.messageId;

      const result = await MessageModel.getMessageId(messageId)

      return res.status(200).json({ success: true, result });
    } catch (error) {
      return res.status(404).json({ success: false, error });
    }
  },

  onGetMessageByMember: async (req, res) => {
    // #swagger.tags = ['rooms']
    // #swagger.summary = "Get all messages of a member in a room"
    // #swagger.responses[200] = {description: "Message sent by member found"}
    // #swagger.responses[500] = {description: "Error while finding messages"}
    try {
      const roomId = req.params.roomId;
      const userId = req.params.userId;
      const result = await MessageModel.getAllMyMessagesFromRoomId(roomId, userId)
      return res.status(200).json({ success: true, result });
    } catch (error) {
      return res.status(500).json({ success: false, error });
    }
  },

  onGetLastMessage: async (req, res) => {
    // #swagger.tags = ['rooms']
    // #swagger.summary = "Get last message sent of a room"
    // #swagger.responses[200] = {description: "Last message found"}
    // #swagger.responses[500] = {description: "Error while looking for last message"}
    try {
      const roomId = req.params.roomId;

      const message = await MessageModel.getLastMessageFromRoomId(roomId);
      return res.status(200).json({ success: true, message: message });
    }
    catch (error) {
      return res.status(500).json({ success: false, error });
    }

  },

  onGetRecentRoomsOfUser: async (req, res) => {
    // #swagger.tags = ['rooms']
    // #swagger.summary = "Get the X last conversations"
    // #swagger.responses[200] = {description: "Rooms of user found with success"}
    // #swagger.responses[500] = {description: "Error while looking for rooms"}

    try {
      const user = req.params.userId;
      const rooms = await RoomModel.getRoomsByUserId(user);
      return res.status(200).json({ success: true, rooms });
    } catch (error) {

      return res.status(500).json({ success: false, error: error })
    }
  },

  onGetRoomsByName: async (req, res) => {
    // #swagger.tags = ['rooms']
    // #swagger.summary = "Get a specific room by its name"
    // #swagger.responses[200] = {description: "Rooms containing regex found"}
    // #swagger.responses[400] = {description: "No name was given for the search"}
    // #swagger.responses[500] = {description: "Error while looking for rooms"}
    try {
      const name = req.params.name;
      const limit = req.query.limit;
      const page = req.query.page;
      const userId = req.query.userId;

      if (typeof name == 'undefined') {
        return res.status(400).json({ success: false, error: "name is undefined in search" });
      }
      const result = await RoomModel.getRoomsByName(name, limit, page, userId);
      return res.status(200).json({ success: true, result });
    } catch (error) {
      console.log(error);
      return res.status(500).json({ success: false, error });
    }
  },

  onInitiate1On1: async (req, res) => {
    // #swagger.tags = ['rooms']
    // #swagger.summary = "Create a 1 on 1 conversation"
    // #swagger.responses[201] = {description: "1on1 room created"}
    // #swagger.responses[500] = {description: "Error while creating 1on1 room"}
    try {
      const creatorId = req.body.creatorId;
      const invitedId = req.body.invitedId;

      // Create a room with no admin, as a 1on1 room
      const room = await RoomModel.initiate1On1("1on1", creatorId, invitedId);

      return res.status(201).json({ success: true, room });

    } catch (error) {
      return res.status(500).json({ success: false, error: error });
    }
  },

  onInitiateGroup: async (req, res) => {
    // #swagger.tags = ['rooms']
    // #swagger.summary = "Create a group chat conversation"
    // #swagger.responses[201] = {description: "Group room created"}
    // #swagger.responses[500] = {description: "Error while creating group room"}
    try {
      const adminId = req.body.adminId;
      const name = req.body.name;
      // Create a room with adminId as its admin
      const room = await RoomModel.initiateGroupChat("group", adminId, name);

      return res.status(201).json({ success: true, room });

    } catch (error) {
      return res.status(500).json({ success: false, error: error });
    }
  },

  onJoinRoom: async (req, res) => {
    // #swagger.tags = ['rooms']
    // #swagger.summary = "Join a room with an url"
    // #swagger.responses[201] = {description: "Room joined with success"}
    // #swagger.responses[500] = {description: "Error while joining group room"}
    try {
      const url = req.params.url;
      const userId = req.body.userId;

      // Add the user in the room
      const room = await MemberModel.addMemberWithURL(userId, url);

      return res.status(201).json({ success: true, room });

    } catch (error) {
      return res.status(500).json({ success: false, error: error });
    }
  },

  onKickUser: async (req, res) => {
    // #swagger.tags = ['rooms']
    // #swagger.summary = "Kick a user from a specific room"
    // #swagger.responses[200] = {description: "User kicked with success"}
    // #swagger.responses[500] = {description: "Error while kicking user in group room"}
    try {
      const roomId = req.body.roomId;
      const userId = req.body.userId;
      const adminId = req.body.adminId;
      const deleted = await MemberModel.kickMember(roomId, userId, adminId);

      return res.status(200).json({ success: true, deleted });

    } catch (error) {
      return res.status(500).json({ success: false, error: error });
    }
  },

  onLeaveRoom: async (req, res) => {
    // #swagger.tags = ['rooms']
    // #swagger.summary = "Leave a group chat"
    // #swagger.responses[200] = {description: "User left room with success"}
    // #swagger.responses[500] = {description: "Error while leaving group room"}
    try {
      const roomId = req.body.roomId;
      const userId = req.body.userId;
      const deleted = await MemberModel.leaveRoom(roomId, userId);

      return res.status(200).json({ success: true, deleted });

    } catch (error) {
      return res.status(500).json({ success: false, error: error });
    }
  },

  onModifyName: async (req, res) => {
    // #swagger.tags = ['rooms']
    // #swagger.summary = "Modify the name of a room"
    // #swagger.responses[200] = {description: "Name was changed"}
    // #swagger.responses[500] = {description: "Error while changing group room name"}
    try {

      const roomId = req.body.roomId;
      const userId = req.body.userId;
      const newName = req.body.name;

      const room = await RoomModel.modifyName(newName, roomId, userId);

      return res.status(200).json({ success: true, room });
    } catch (error) {
      console.log(error);
      return res.status(500).json({ success: false, error });
    }
  },

  onPostMessage: async (req, res) => {
    // #swagger.tags = ['rooms']
    // #swagger.summary = "Post a message in a specific room"
    // #swagger.responses[200] = {description: "Post created with success"}
    // #swagger.responses[500] = {description: "Error while creating post"}
    try {
      const newMessage = req.body.message;
      const roomId = req.body.roomId;
      const userId = req.body.userId;
      const tagIds = req.body.tagIds
      const parentId = req.body.parentId;
      const URL = req.body.url;
      const type = req.body.type;

      const sendMessage = await MessageModel.createPostInRoom(roomId, newMessage, userId, tagIds, parentId, URL, type);
      return res.status(200).json({ success: true, message: sendMessage });

    }
    catch (error) {
      return res.status(500).json({ success: false, message: "Cant post message" })
    }
  },

  onDeleteMessage: async (req, res) => {
    // #swagger.tags = ['rooms']
    // #swagger.summary = "Change the type of a specific message in a room by its id"
    // #swagger.responses[200] = {description: "Message deleted with success"}
    // #swagger.responses[500] = {description: "Error while deleting message"}
    try {
      const { messageId } = req.body;
      const { userId } = req.body;
      const result = await MessageModel.changeMessageType(userId, messageId, -1)

      return res.status(200).json({ success: true, message: result });
    } catch (error) {
      return res.status(500).json({ success: false, error });
    }
  },

  // WARNING: this function needs to transfer post request to manao backend for firebase notification management
  onSendNotification: async (req, res) => {
    // #swagger.tags = ['rooms']
    // #swagger.summary = "Send notification to the list of users concerned"
    // #swagger.responses[201] = {description: "Notifications sent to concerned users"}
    // #swagger.responses[500] = {description: "Error while sending notifications to concerned users"}
    try {
      const message = req.body.message;
      let members = await MemberModel.getUsersInRoom(message.roomId);
      members = members.filter((member) => member.userId != message.userId && member.notifications == true);
      let sendTo = [];
      for (const member of members) {
        sendTo.push(member.userId);
      }
      // To send to manao backend: 
      // message
      // sendTo

      return res.status(201).json({ success: true, message: message, membersId: sendTo });
    } catch (error) {
      console.log(error);
      return res.status(500).json({ success: false, error });
    }
  },

  onUpdateDeletedMessages: async (req, res) => {
    // #swagger.tags = ['rooms']
    // #swagger.summary = "Delete messages once the GDPR conservation period is over"
    // #swagger.responses[200] = {description: "Message permanently deleted with success"}
    // #swagger.responses[500] = {description: "Error while deleting messages from database"}
    try {
      const { duration } = req.body

      const result = await MessageModel.updateDeletedMessages(duration)

      return res.status(200).json({ success: true, message: result });
    }
    catch (error) {
      return res.status(500).json({ success: false, error });
    }
  },
}
