import { Router } from 'express';
import { sendMessage, getChatHistory, deleteChatHistory, getContext } from '../controllers/chatController';

const router = Router();

// Chat endpoints
router.post('/message', sendMessage);
router.get('/history', getChatHistory);
router.delete('/history', deleteChatHistory);
router.get('/context', getContext);

export default router; 