import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { runLegacyEtl } from '../src/etl/legacy-etl';

const prisma = new PrismaClient();

runLegacyEtl(prisma, (step, extra) => {
  if (extra?.done && extra?.total) {
    console.log(`${step} ${extra.done}/${extra.total}`);
  } else {
    console.log(step, extra?.counts ? extra.counts : '');
  }
})
  .then((result) => {
    console.log('Done', result);
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
