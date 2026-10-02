import{Router}from'express';import{getWordController}from'../controllers/wordController';const router=Router();router.get('/:word',getWordController);export default router;
