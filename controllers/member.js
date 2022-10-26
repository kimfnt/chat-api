// models
import MemberModel from '../models/member.js';

export default {
  onGetAllMembers: async (req, res) => {
    // #swagger.tags = ['members']
    // #swagger.summary = "Get all members of the chat room"
    // #swagger.responses[200] = {description: "All members retrieved with success"}
    // #swagger.responses[500] = {description: "Error while retrieving all members"}
    try {
      const members = await MemberModel.getMembers();
      return res.status(200).json({ success: true, members });
    } catch (error) {
      return res.status(500).json({ success: false, error: error });
    }
  },

  onGetMember: async (req, res) => {
    // #swagger.tags = ['members']
    // #swagger.summary = "Get member object of the current user in the room"
    // #swagger.responses[200] = {description: "Member retrieved with success"}
    // #swagger.responses[500] = {description: "Error while retrieving member"}
    try {
      const roomId = req.params.roomId;
      const userId = req.params.userId;

      const member = await MemberModel.findOne({ 'roomId': roomId, 'userId': userId });
      return res.status(200).json({ success: true, member });
    } catch (error) {
      return res.status(500).json({ success: false, error: error });
    }
  },

  onGetRoomsOfUser: async (req, res) => {
    // #swagger.tags = ['members']
    // #swagger.summary = "Get the list of rooms where you can find the user"
    // #swagger.responses[200] = {description: "All rooms of user retrieved with success"}
    // #swagger.responses[500] = {description: "Error while retrieving all rooms of user"}
    try {
      const members = await MemberModel.getRoomsOfUser(req.params.id);
      return res.status(200).json({ success: true, members });
    } catch (error) {
      return res.status(500).json({ success: false, error: error });
    }
  },

  onGetUsersInRoom: async (req, res) => {
    // #swagger.tags = ['members']
    // #swagger.summary = "Get the list of users in a specific room"
    // #swagger.responses[200] = {description: "All users in room retrieved with success"}
    // #swagger.responses[500] = {description: "Error while retrieving all users in room"}
    try {
      const members = await MemberModel.getUsersInRoom(req.params.roomId);
      return res.status(200).json({ success: true, members });
    } catch (error) {
      return res.status(500).json({ success: false, error: error });
    }
  },

  onUpdateNotification: async (req, res) => {
    // #swagger.tags = ['members']
    // #swagger.summary = "Update the status to get notifications or not"
    // #swagger.responses[200] = { description: "Notification status for the room has been changed"}
    // #swagger.responses[500] = { description: "Error on changing notification status"}
    try {
      const roomId = req.body.roomId;
      const userId = req.body.userId;
      const notification = req.body.notification;
      const member = await MemberModel.setNotification(roomId, userId, notification);
      return res.status(200).json({ success: true, member });
    } catch (error) {
      return res.status(500).json({ success: false, error: error });
    }
  },

  onReadNotification: async (req, res) => {
    // #swagger.tags = ['members']
    // #swagger.summary = "Put the number of notifications to 0"
    // #swagger.responses[200] = { description: "Number of notifications of the user for a single room has been changed"}
    // #swagger.responses[500] = { description: "Error on setting notification status"}
    try {
      const roomId = req.body.roomId;
      const userId = req.body.userId;
      const member = await MemberModel.markAsRead(roomId, userId);
      return res.status(200).json({ success: true, member });
    } catch (error) {
      return res.status(500).json({ success: false, error: error });
    }
  }
}