/* The deployable seed lives in seed.cjs so the production Docker image can run
   it without dev-only TypeScript tooling. This wrapper keeps `tsx prisma/seed.ts`
   usable for local habits. */
import './seed.cjs'
