// Every kind of bought part the inventory knows as data (src/nexus/kinds/core.ts says how one is written), by trade.

import type { KindDef } from './core';
import { ELECTRICAL } from './electrical';
import { FASTENERS } from './fasteners';
import { FLUID } from './fluid';
import { GOODS } from './goods';
import { INDUSTRIAL } from './industrial';
import { DEVICES } from './devices';
import { MORE } from './more';
import { MOTION } from './motion';
import { PLANT } from './plant';
import { SITE } from './site';
import { STOCK } from './stock';
import { TOOLS } from './tools';

export const KINDS: KindDef[] = [...FASTENERS, ...MOTION, ...ELECTRICAL, ...FLUID, ...STOCK, ...TOOLS, ...MORE, ...DEVICES, ...SITE, ...INDUSTRIAL, ...GOODS, ...PLANT];
export type { KindDef } from './core';
