import { Router } from 'express';
import { webhookController } from '../controllers/webhookController';
import { authenticate } from '../middleware/authenticate';
import { requireSecretKey } from '../middleware/requireSecretKey';

const router = Router();

/**
 * @openapi
 * /api/v1/webhooks:
 *   post:
 *     tags: [Webhooks]
 *     summary: Register a webhook endpoint
 *     description: >
 *       Registers a callback URL that will receive a POST request whenever a payment
 *       transitions to `CONFIRMED`. The response includes a `secret` — store it
 *       securely as it is shown **once only**. Use it to verify the
 *       `X-Webhook-Signature` header on incoming requests:
 *       compute `sha256=HMAC-SHA256(secret, rawBody)` and compare.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [url]
 *             properties:
 *               url:
 *                 type: string
 *                 format: uri
 *                 example: https://myshop.com/webhooks/crypto
 *     responses:
 *       201:
 *         description: Webhook registered — secret shown once
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/WebhookResult'
 *       400:
 *         description: Missing or invalid url
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ApiError' }
 *       401:
 *         description: Missing or invalid JWT
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ApiError' }
 */
router.post('/', authenticate, requireSecretKey, webhookController.registerWebhook);

/**
 * @openapi
 * /api/v1/webhooks:
 *   get:
 *     tags: [Webhooks]
 *     summary: List registered webhooks
 *     description: Returns all webhooks registered by the authenticated user. Secrets are never included.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of webhooks
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/WebhookResult'
 *       401:
 *         description: Missing or invalid JWT
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ApiError' }
 */
router.get('/', authenticate, requireSecretKey, webhookController.listWebhooks);

/**
 * @openapi
 * /api/v1/webhooks/{id}:
 *   delete:
 *     tags: [Webhooks]
 *     summary: Deactivate a webhook
 *     description: >
 *       Marks the webhook as inactive — it will no longer receive deliveries.
 *       Delivery history is preserved. To re-enable, register a new webhook.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Webhook ID
 *     responses:
 *       200:
 *         description: Webhook deactivated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       format: uuid
 *       401:
 *         description: Missing or invalid JWT
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ApiError' }
 *       404:
 *         description: Webhook not found
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ApiError' }
 */
router.delete('/:id', authenticate, requireSecretKey, webhookController.deleteWebhook);

/**
 * @openapi
 * /api/v1/webhooks/{id}/deliveries:
 *   get:
 *     tags: [Webhooks]
 *     summary: List delivery history for a webhook
 *     description: >
 *       Returns the 50 most recent delivery attempts for a webhook, ordered newest first.
 *       Each entry shows the HTTP response code, truncated response body, attempt count,
 *       and — for retrying deliveries — the time of the next attempt.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Webhook ID
 *     responses:
 *       200:
 *         description: List of delivery attempts
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/WebhookDeliveryResult'
 *       401:
 *         description: Missing or invalid JWT
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ApiError' }
 *       404:
 *         description: Webhook not found
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ApiError' }
 */
router.get('/:id/deliveries', authenticate, requireSecretKey, webhookController.listDeliveries);

/**
 * @openapi
 * /api/v1/webhooks/{id}/test:
 *   post:
 *     tags: [Webhooks]
 *     summary: Send a test delivery to a webhook
 *     description: >
 *       Fires a fake `payment.confirmed` payload to the registered URL and returns
 *       the HTTP response code and body. Use this to verify your callback URL is
 *       reachable and correctly handles signed payloads before going live.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Webhook ID
 *     responses:
 *       200:
 *         description: Test delivery result (success field indicates 2xx response from target)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     success:
 *                       type: boolean
 *                     responseCode:
 *                       type: integer
 *                       nullable: true
 *                     responseBody:
 *                       type: string
 *                       nullable: true
 *       400:
 *         description: Webhook is inactive
 *       404:
 *         description: Webhook not found
 */
router.post('/:id/test', authenticate, requireSecretKey, webhookController.testWebhook);

export default router;
