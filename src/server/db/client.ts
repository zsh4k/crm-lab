import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { env } from "../lib/env";
import * as schema from "./schema";

const queryClient = postgres(env.databaseUrl, { max: 10 });

export const db = drizzle(queryClient, { schema });
export { schema };
