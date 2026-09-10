import { Router } from 'express';
import authRoutes from '../modules/auth/auth.routes.js';
import usersRoutes from '../modules/users/users.routes.js';
import patientsRoutes from '../modules/patients/patients.routes.js';
import facilitiesRoutes from '../modules/facilities/facilities.routes.js';
import careRoutingRoutes from '../modules/care-routing/care-routing.routes.js';
import triageRoutes from '../modules/triage/triage.routes.js';
import encountersRoutes from '../modules/encounters/encounters.routes.js';
import appointmentsRoutes from '../modules/appointments/appointments.routes.js';
import queuesRoutes from '../modules/queues/queues.routes.js';
import referralsRoutes from '../modules/referrals/referrals.routes.js';
import followupsRoutes from '../modules/followups/followups.routes.js';
import medicinesRoutes from '../modules/medicines/medicines.routes.js';
import diagnosticsRoutes from '../modules/diagnostics/diagnostics.routes.js';
import consentRoutes from '../modules/consent/consent.routes.js';
import notificationsRoutes from '../modules/notifications/notifications.routes.js';
import analyticsRoutes from '../modules/analytics/analytics.routes.js';
import dataQualityRoutes from '../modules/data-quality/data-quality.routes.js';
import syncRoutes from '../modules/sync/sync.routes.js';
import demoRoutes from '../modules/demo/demo.routes.js';

const apiV1Router = Router();

apiV1Router.use('/auth', authRoutes);
apiV1Router.use('/users', usersRoutes);
apiV1Router.use('/patients', patientsRoutes);
apiV1Router.use('/facilities', facilitiesRoutes);
apiV1Router.use('/care-routing', careRoutingRoutes);
apiV1Router.use('/triage', triageRoutes);
apiV1Router.use('/encounters', encountersRoutes);
apiV1Router.use('/appointments', appointmentsRoutes);
apiV1Router.use('/queues', queuesRoutes);
apiV1Router.use('/referrals', referralsRoutes);
apiV1Router.use('/followups', followupsRoutes);
apiV1Router.use('/medicines', medicinesRoutes);
apiV1Router.use('/', medicinesRoutes); // covers /facilities/:facilityId/medicines
apiV1Router.use('/', diagnosticsRoutes); // covers /facilities/:facilityId/diagnostics
apiV1Router.use('/consents', consentRoutes);
apiV1Router.use('/notifications', notificationsRoutes);
apiV1Router.use('/analytics', analyticsRoutes);
apiV1Router.use('/data-quality', dataQualityRoutes);
apiV1Router.use('/sync', syncRoutes);
apiV1Router.use('/demo', demoRoutes);

export default apiV1Router;
