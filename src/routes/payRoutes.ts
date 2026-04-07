import { Router } from 'express';
import { payPageController } from '../controllers/payPageController';

const router = Router();

// Public — no auth required. The payment UUID acts as the access token.
router.get('/:id', payPageController.renderPaymentPage);
router.get('/:id/status', payPageController.getPaymentStatus);

export default router;
