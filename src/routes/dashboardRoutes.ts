import { Router } from 'express';
import { dashboardController } from '../controllers/dashboardController';

const router = Router();

// All dashboard routes serve the same SPA shell — routing is handled client-side
router.get('/', dashboardController.renderDashboard);
router.get('/*', dashboardController.renderDashboard);

export default router;
