// models
import RoomModel from '../models/room.js';
import UserModel from '../models/user.js';

export default {
  onGetAllUsers: async (req, res) => {
    // #swagger.tags = ['users']
    // #swagger.summary = "Get all users of the app"
    // #swagger.responses[200] = {description: "All users retrieved with success"}
    // #swagger.responses[500] = {description: "Error while retrieving users"}
    try {
      const users = await UserModel.getUsers();
      return res.status(200).json({ success: true, users });
    } catch (error) {
      return res.status(500).json({ success: false, error: error })
    }
  },

  onGetUserById: async (req, res) => {
    // #swagger.tags = ['users']
    // #swagger.summary = "Get a user's informations by its id"
    // #swagger.responses[200] = {description: "User retrieved with success"}
    // #swagger.responses[500] = {description: "Error while retrieving user"}
    try {

      const user = await UserModel.getUserById(req.params.id);
      return res.status(200).json({ success: true, user });
    } catch (error) {
      return res.status(500).json({ success: false, error: error })
    }
  },

  onGetOtherUserOfRoom: async (req, res) => {
    // #swagger.tags = ['users']
    // #swagger.summary = "Get a user's informations by its id"
    // #swagger.responses[200] = {description: "Other user of 1on1 room retrieved with success"}
    // #swagger.responses[500] = {description: "Error while retrieving other user of 1on1 room"}
    try {
      const roomId = req.params.roomId
      const userId = req.params.userId
      const user = await UserModel.getOtherUserOfRoom(roomId, userId);
      return res.status(200).json({ success: true, user });
    } catch (error) {
      return res.status(500).json({ success: false, error: error })
    }
  },

  onCreateUser: async (req, res) => {
    // #swagger.tags = ['users']
    // #swagger.summary = "Create a user with a name"
    // #swagger.responses[201] = {description: "User created with success"}
    // #swagger.responses[500] = {description: "Error while creating user"}
    try {
      const { name } = req.body;

      const user = await UserModel.createUser(name);
      return res.status(201).json({ success: true, user });

    } catch (error) {
      return res.status(500).json({ success: false, error: error })
    }
  },

  onDeleteUserById: async (req, res) => {
    // #swagger.tags = ['users']
    // #swagger.summary = "Delete a specific user by its id"
    // #swagger.responses[200] = {description: "User deleted with success"}
    // #swagger.responses[500] = {description: "Error while deleting user"}
    try {
      const user = await UserModel.deleteByUserById(req.params.id);
      return res.status(200).json({
        success: true,
        message: `Deleted a count of ${user.deletedCount} user.`
      });
    } catch (error) {
      return res.status(500).json({ success: false, error: error })
    }
  },

  onGetLastMessageFromAllRoom: async (req, res) => {
    // #swagger.tags = ['users']
    // #swagger.summary = "Get the last message from all the user's rooms"
    // #swagger.responses[200] = {description: "Last message from all rooms retrieved with success"}
    // #swagger.responses[500] = {description: "Error while retrieving last message from all rooms"}
    try {
      const userId = req.params.id;
      const messages = await UserModel.getLastMessageFromAllRoom(userId);

      return res.status(200).json({ success: true, messages });
    } catch (error) {
      console.log(error);
      return res.status(500).json({ success: false, error });
    }
  },

  onGetUsersByRoomId: async (req, res) => {
    // #swagger.tags = ['users']
    // #swagger.summary = "Get the last message from all the user's rooms"
    // #swagger.responses[200] = {description: "All users in the room retrieved with success"}
    // #swagger.responses[500] = {description: "Error while retrieving users in the room"}
    try {

      const roomId = req.params.id;
      const users = await UserModel.getUsersByRoomId(roomId)

      return res.status(200).json({ success: true, users });
    } catch (error) {
      console.log(error);
      return res.status(500).json({ success: false, error });
    }
  },

  onIsAdmin: async (req, res) => {
    // #swagger.tags = ['users']
    // #swagger.summary = "Get the last message from all the user's rooms"
    // #swagger.responses[200] = {description: "User is admin of the room"}
    // #swagger.responses[404] = {description: "User is not admin"}
    // #swagger.responses[500] = {description: "Error while determining if user is admin"}
    try {

      const userId = req.params.userId;
      const roomId = req.params.roomId;

      const room = await RoomModel.isAdmin(userId, roomId)
      if (!room) return res.status(404).json({ success: false, room });
      return res.status(200).json({ success: true, room });
    } catch (error) {
      return res.status(500).json({ success: false, error });
    }
  }

}