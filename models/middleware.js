import jwt from 'jsonwebtoken';
import { nanoid } from "nanoid";
import UserModel from '../models/user.js';

const SECRET_KEY = nanoid(16);
console.log(SECRET_KEY)

export const encode = async (req, res, next) => {
  try {
    const userId = req.params.userId;
    const token = req.params.token;
    const user = await UserModel.getUserByIdAndToken(userId,token)
    const payload = {
      user: user,
    };
    const authToken = jwt.sign(payload, SECRET_KEY);
    req.authToken = authToken;
    req.user = user;
    next();
  } catch (error) {
    return res.status(400).json({ success: false, message: error.error });
  }
}

export const decode = (req, res, next) => {
  if (!req.headers['authorization']) {
    return res.status(400).json({ success: false, message: 'No access token provided' });
  }
  const accessToken = req.headers.authorization.split(' ')[1];
  try {
    const decoded = jwt.verify(accessToken, SECRET_KEY);
    req.user = decoded.user;
    return next();
  } catch (error) {

    return res.status(401).json({ success: false, message: error.message });
  }
}