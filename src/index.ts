import { cors } from "@elysiajs/cors";
import { openapi } from "@elysiajs/openapi";
import { Elysia } from "elysia";
import { pool } from "./db";
import { log } from "./lib/logger";
import { incidentRouter } from "./router/incident";

const app = new Elysia()
	.use(
		cors({
			origin: process.env.FRONTEND_URL,
			methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
			credentials: true,
		}),
	)
	.use(log.into())
	.use(
		openapi({
			documentation: {
				info: {
					title: "Tracepoint API",
					version: "1.0.0",
					description:
						"REST API for managing production incidents with pagination, filtering, and sorting.",
				},
				tags: [{ name: "Incidents", description: "Incident management endpoints" }],
			},
		}),
	)
	.get("/", () => ({
		name: "Tracepoint API",
		version: "1.0.0",
		docs: "/openapi",
		health: "/health",
	}))
	.get("/health", () => ({
		status: "ok",
		timestamp: new Date().toISOString(),
	}))
	.group("/api", (app) => app.use(incidentRouter))
	.onError(({ code, error, set }) => {
		if (code !== "VALIDATION") {
			log.error({ code, error }, `Error [${code}]`);
		}

		const errorMessage = "message" in error ? (error.message as string) : "";

		if (
			errorMessage.includes("Connection terminated") ||
			errorMessage.includes("ETIMEDOUT") ||
			errorMessage.includes("ECONNREFUSED")
		) {
			set.status = 503;
			return {
				status: "error",
				code: "SERVICE_UNAVAILABLE",
				message: "Database temporarily unavailable. Please try again.",
			};
		}

		switch (code) {
			case "VALIDATION":
				set.status = 400;
				return {
					status: "error",
					code: "VALIDATION_ERROR",
					message: error.message,
				};
			case "NOT_FOUND":
				set.status = 404;
				return {
					status: "error",
					code: "NOT_FOUND",
					message: "Resource not found",
				};
			case "PARSE":
				set.status = 400;
				return {
					status: "error",
					code: "PARSE_ERROR",
					message: "Invalid request body",
				};
			default:
				set.status = 500;
				return {
					status: "error",
					code: "INTERNAL_ERROR",
					message: "Internal server error",
				};
		}
	})
	.listen(process.env.PORT || 4000);

log.info(`Tracepoint API running at http://localhost:${app.server?.port}`);
log.info(`OpenAPI docs at http://localhost:${app.server?.port}/openapi`);

const gracefulShutdown = async (signal: string) => {
	log.info(`${signal} received. Shutting down gracefully...`);
	app.stop();
	await pool.end();
	log.info("Server stopped.");
	process.exit(0);
};

process.on("SIGINT", () => gracefulShutdown("SIGINT"));
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
