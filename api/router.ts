import { createRouter, publicQuery } from "./middleware";
import { decisionRouter } from "./decisionRouter";

export const appRouter = createRouter({
  ping: publicQuery.query(() => ({ ok: true, ts: Date.now() })),
  decision: decisionRouter,
});

export type AppRouter = typeof appRouter;
