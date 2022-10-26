import express from 'express';
// controllers
import room from '../controllers/room.js';

const router = express.Router();

router
  .put('/deleteMessage', room.onDeleteMessage)
  .put('/modifyName', room.onModifyName)
  .put('/generateURL', room.onGenerateURL)

  .delete('/update', room.onUpdateDeletedMessages)
  .delete('/kickUser', room.onKickUser)
  .delete('/leaveRoom', room.onLeaveRoom)

  .get('/search/:name', room.onGetRoomsByName)
  .get('/userId/:userId', room.onGetRecentRoomsOfUser)
  .get('/:roomId', room.onGetRoomById)

  .get('/message/:messageId', room.onGetMessageById)
  .get('/messages/:roomId' , room.onGetMessagesFromRoomId)
  .get('/lastMessage/:roomId' , room.onGetLastMessage)
  .get('/member/:userId/:roomId' , room.onGetMessageByMember)

  .post('/sendMessage', room.onPostMessage)
  .post('/initiateGroup', room.onInitiateGroup)
  .post('/initiate1On1', room.onInitiate1On1)
  .post('/join/:url', room.onJoinRoom)
  .post('/sendNotification', room.onSendNotification)


export default router;
