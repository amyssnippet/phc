import { generateDemoData } from './generate-demo-data.js';

export async function resetDemoState() {
  await generateDemoData();
  return { success: true, message: 'Demo environment reset to clean initial state with Phase 2 multi-PHC data' };
}
