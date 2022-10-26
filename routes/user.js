import express from 'express';
// controllers
import user from '../controllers/user.js';

const router = express.Router();

router
  .get('/otherUser/:roomId/:userId', user.onGetOtherUserOfRoom)
  .get('/admin/:userId/:roomId', user.onIsAdmin)
  .get('/lastMessage/:id', user.onGetLastMessageFromAllRoom)
  .get('/room/:id', user.onGetUsersByRoomId)
  .get('/', user.onGetAllUsers)
  .get('/:id', user.onGetUserById)


  .post('/', user.onCreateUser)
  .delete('/:id', user.onDeleteUserById)

export default router;
