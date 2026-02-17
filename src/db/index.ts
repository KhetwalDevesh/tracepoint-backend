import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import { log } from "../lib/logger";

export const pool = new Pool({
	connectionString: process.env.DATABASE_URL,
	max: 10,
	idleTimeoutMillis: 30000,
	connectionTimeoutMillis: 10000,
	ssl: {
		rejectUnauthorized: false,
	},
});

const adapter = new PrismaPg(pool);
const basePrisma = new PrismaClient({ adapter, log: ["error", "warn"] });

function isRetryable(error: unknown): boolean {
	if (error instanceof Error) {
		const message = error.message;
		return (
			message.includes("Connection terminated") ||
			message.includes("ETIMEDOUT") ||
			message.includes("ECONNREFUSED") ||
			message.includes("connection is insecure")
		);
	}
	return false;
}

export const db = basePrisma.$extends({
	query: {
		async $allOperations({ operation, args, query }) {
			const maxRetries = 3;
			for (let attempt = 1; attempt <= maxRetries; attempt++) {
				try {
					return await query(args);
				} catch (error) {
					if (!isRetryable(error) || attempt === maxRetries) throw error;
					log.warn(`DB retry attempt ${attempt} for ${operation}`);
					await new Promise((r) => setTimeout(r, 500 * attempt));
				}
			}
		},
	},
});
