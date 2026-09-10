import { resetDemoState } from '../src/modules/demo/demo.service.js';

resetDemoState()
  .then(() => {
    console.log('Demo reset completed successfully!');
    process.exit(0);
  })
  .catch((err) => {
    console.error('Demo reset error:', err);
    process.exit(1);
  });
