import { readFileSync } from 'fs';
import path from 'path';

const openapiPath = path.join(process.cwd(), 'src', 'configs', 'openapi.json');

export const openapiDocument = JSON.parse(readFileSync(openapiPath, 'utf8'));
