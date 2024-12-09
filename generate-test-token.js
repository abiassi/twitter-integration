import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

const testUser = {
  id: 1,
  name: 'Test User'
};

const token = jwt.sign(testUser, process.env.JWT_SECRET);
console.log('Test JWT Token:', token);
