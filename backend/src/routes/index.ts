import { Router } from 'express';
import authRoutes from '../modules/auth/auth.routes.js';
import meRoutes from './me.routes.js';
import workerRoutes from './worker.routes.js';
import doctorRoutes from './doctor.routes.js';
import facilityRoutes from './facility.routes.js';
import districtRoutes from './district.routes.js';
import publicRoutes from './public.routes.js';
import metaRoutes from './meta.routes.js';
import careRoutingRoutes from '../modules/care-routing/care-routing.routes.js';
import syncRoutes from '../modules/sync/sync.routes.js';
import demoRoutes from '../modules/demo/demo.routes.js';
import patientsRoutes from '../modules/patients/patients.routes.js';
import facilitiesRoutes from '../modules/facilities/facilities.routes.js';
import appointmentsRoutes from '../modules/appointments/appointments.routes.js';
import queuesRoutes from '../modules/queues/queues.routes.js';
import referralsRoutes from '../modules/referrals/referrals.routes.js';
import triageRoutes from '../modules/triage/triage.routes.js';
import followupsRoutes from '../modules/followups/followups.routes.js';
import dataQualityRoutes from '../modules/data-quality/data-quality.routes.js';
import analyticsRoutes from '../modules/analytics/analytics.routes.js';

const apiV1Router = Router();

// 1. Core Scoped API Trees (Phase 2 Architecture)
apiV1Router.use('/auth', authRoutes);
apiV1Router.use('/public', publicRoutes);
apiV1Router.use('/me', meRoutes);
apiV1Router.use('/worker', workerRoutes);
apiV1Router.use('/doctor', doctorRoutes);
apiV1Router.use('/facility', facilityRoutes);
apiV1Router.use('/district', districtRoutes);
apiV1Router.use('/meta', metaRoutes);

// 2. Cross-cutting domain endpoints
apiV1Router.use('/care-routing', careRoutingRoutes);
apiV1Router.use('/sync', syncRoutes);
apiV1Router.use('/demo', demoRoutes);

// 3. Protected Legacy / Shared endpoints
apiV1Router.use('/facilities', facilitiesRoutes);
apiV1Router.use('/patients', patientsRoutes);
apiV1Router.use('/appointments', appointmentsRoutes);
apiV1Router.use('/queues', queuesRoutes);
apiV1Router.use('/referrals', referralsRoutes);
apiV1Router.use('/triage', triageRoutes);
apiV1Router.use('/followups', followupsRoutes);
apiV1Router.use('/data-quality', dataQualityRoutes);
apiV1Router.use('/analytics', analyticsRoutes);

export default apiV1Router;
