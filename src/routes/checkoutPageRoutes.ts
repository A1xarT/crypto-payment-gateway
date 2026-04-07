import { Router } from 'express';
import { renderCheckoutPage } from '../controllers/checkoutPageController';

const router = Router();

router.get('/:id', renderCheckoutPage);

export default router;
