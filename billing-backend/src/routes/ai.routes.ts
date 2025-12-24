import { Router } from 'express';
import { AIController } from '../controllers/ai.controller';
import { authenticateToken, authorizeBusinessAccess } from '../middleware/auth.middleware';
// import multer from 'multer';

const router = Router();
const aiController = new AIController();

// Configure multer for file uploads
// Configure multer for file uploads
// const _upload = multer({ ... }) - Unused currently
// Multer configuration moved or unused
// const _upload = ...

/**
 * @swagger
 * /api/ai/banner:
 *   post:
 *     summary: Generate AI banner
 *     tags: [AI]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - prompt
 *             properties:
 *               prompt:
 *                 type: string
 *                 description: Description of the banner to generate
 *     responses:
 *       200:
 *         description: Banner generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     imageUrl:
 *                       type: string
 *       400:
 *         description: Invalid request
 */
router.post('/banner', authenticateToken, authorizeBusinessAccess, aiController.generateBanner);

/**
 * @swagger
 * /api/ai/sql:
 *   post:
 *     summary: Generate SQL query from natural language
 *     tags: [AI]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - prompt
 *             properties:
 *               prompt:
 *                 type: string
 *                 description: Natural language description of the query
 *     responses:
 *       200:
 *         description: SQL query generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     query:
 *                       type: string
 *                     results:
 *                       type: array
 *       400:
 *         description: Invalid request or unsafe query
 */
router.post('/sql', authenticateToken, authorizeBusinessAccess, aiController.generateSQLQuery);

/**
 * @swagger
 * /api/ai/text:
 *   post:
 *     summary: Generate text content
 *     tags: [AI]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - prompt
 *             properties:
 *               prompt:
 *                 type: string
 *                 description: Description of the text to generate
 *               style:
 *                 type: string
 *                 enum: [professional, casual, marketing, technical]
 *                 default: professional
 *     responses:
 *       200:
 *         description: Text generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     text:
 *                       type: string
 *       400:
 *         description: Invalid request
 */
router.post('/text', authenticateToken, authorizeBusinessAccess, aiController.generateText);

/**
 * @swagger
 * /api/ai/content:
 *   get:
 *     summary: Get AI generated content history
 *     tags: [AI]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [banner, sql_query, text]
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *     responses:
 *       200:
 *         description: List of generated content
 */
router.get('/content', authenticateToken, authorizeBusinessAccess, aiController.getGeneratedContent);

/**
 * @swagger
 * /api/ai/content/{contentId}:
 *   delete:
 *     summary: Delete AI generated content
 *     tags: [AI]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: contentId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Content deleted successfully
 *       404:
 *         description: Content not found
 */
router.delete('/content/:contentId', authenticateToken, authorizeBusinessAccess, aiController.deleteGeneratedContent);

/**
 * @swagger
 * /api/ai/sql/execute:
 *   post:
 *     summary: Execute SQL query with safety checks
 *     tags: [AI]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - query
 *             properties:
 *               query:
 *                 type: string
 *                 description: SQL query to execute
 *     responses:
 *       200:
 *         description: Query executed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *       400:
 *         description: Unsafe query or execution error
 */
router.post('/sql/execute', authenticateToken, authorizeBusinessAccess, aiController.executeSQLQuery);

export { router as aiRoutes };