import express from 'express';
// controllers
import member from '../controllers/member.js';

const router = express.Router();

router
  .get('/', member.onGetAllMembers)
  .get('/userId/:id', member.onGetRoomsOfUser)
  .get('/roomId/:roomId', member.onGetUsersInRoom)
  .get('/:roomId/:userId', member.onGetMember)

  .put('/updateNotification', member.onUpdateNotification)
  .put('/read', member.onReadNotification)



export default router;
