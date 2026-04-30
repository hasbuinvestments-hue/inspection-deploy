import { FEE_SCHEDULE } from './src/lib/feeData.js';
import fs from 'fs';
fs.writeFileSync('../inspection-backend/data/fees.json', JSON.stringify(FEE_SCHEDULE, null, 2));
console.log('Fees exported successfully');
