import type { Severity, Status } from "@prisma/client";
import { db } from "./index";
import { log } from "../lib/logger";

const SERVICES = [
	"Auth",
	"Payments",
	"Backend",
	"Frontend",
	"Database",
	"CDN",
	"Search",
	"Messaging",
	"Analytics",
	"Infrastructure",
];

const OWNERS = [
	"jason@team",
	"amy@team",
	"dev@team",
	"ops@team",
	"sre@team",
	"platform@team",
	"backend@team",
	"frontend@team",
	null,
	null,
	null,
];

const INCIDENT_TEMPLATES: { title: string; summaryTemplate: string }[] = [
	{
		title: "Login Failure",
		summaryTemplate: "Users unable to log in due to {service} service issues.",
	},
	{
		title: "API Timeout",
		summaryTemplate:
			"API requests to the {service} service were timing out, causing disruptions for users.",
	},
	{
		title: "Payment Delay",
		summaryTemplate: "Payment processing delays detected in the {service} pipeline.",
	},
	{
		title: "UI Bug on Dashboard",
		summaryTemplate: "Dashboard UI rendering incorrectly on {service} components.",
	},
	{
		title: "Database Issue",
		summaryTemplate: "Database connection pool exhaustion in the {service} layer.",
	},
	{
		title: "High Latency",
		summaryTemplate: "Elevated latency observed in the {service} service endpoints.",
	},
	{
		title: "Memory Leak",
		summaryTemplate: "Memory leak detected in the {service} service causing OOM restarts.",
	},
	{
		title: "Deployment Failure",
		summaryTemplate: "Failed deployment to the {service} service, rollback initiated.",
	},
	{
		title: "SSL Certificate Expiry",
		summaryTemplate: "SSL certificate for {service} approaching expiry, renewal needed.",
	},
	{
		title: "Rate Limiting Triggered",
		summaryTemplate: "Rate limiting triggered on {service} API affecting legitimate users.",
	},
	{
		title: "Data Sync Failure",
		summaryTemplate: "Data synchronization between {service} and downstream services failed.",
	},
	{
		title: "CDN Cache Miss Storm",
		summaryTemplate: "High cache miss rate on {service} CDN causing origin overload.",
	},
	{
		title: "Search Index Corruption",
		summaryTemplate: "Search index in {service} became corrupted, returning stale results.",
	},
	{
		title: "Queue Backlog",
		summaryTemplate: "Message queue backlog growing in {service}, processing delayed.",
	},
	{
		title: "DNS Resolution Failure",
		summaryTemplate: "DNS resolution failures for {service} endpoints across multiple regions.",
	},
	{
		title: "Disk Space Alert",
		summaryTemplate: "Disk space on {service} servers reaching critical threshold.",
	},
	{
		title: "CPU Spike",
		summaryTemplate: "CPU utilization spike on {service} instances causing degraded performance.",
	},
	{
		title: "Configuration Drift",
		summaryTemplate: "Configuration drift detected in {service} environment variables.",
	},
	{
		title: "Webhook Delivery Failure",
		summaryTemplate: "Webhook deliveries from {service} failing with timeout errors.",
	},
	{
		title: "Authentication Token Leak",
		summaryTemplate: "Potential authentication token exposure detected in {service} logs.",
	},
	{
		title: "Third-party API Outage",
		summaryTemplate: "Third-party API used by {service} experiencing outage.",
	},
	{
		title: "Load Balancer Misconfiguration",
		summaryTemplate: "Load balancer for {service} sending traffic to unhealthy instances.",
	},
	{
		title: "Cron Job Failure",
		summaryTemplate: "Scheduled cron job in {service} failed to execute on time.",
	},
	{
		title: "Email Delivery Failure",
		summaryTemplate: "Email notifications from {service} not being delivered.",
	},
	{
		title: "Monitoring Gap",
		summaryTemplate: "Monitoring blind spot detected in {service} — alerts not firing.",
	},
	{
		title: "Connection Pool Exhaustion",
		summaryTemplate: "Connection pool in {service} exhausted under high load.",
	},
	{
		title: "Region Failover",
		summaryTemplate: "Automatic failover triggered for {service} in primary region.",
	},
	{
		title: "Data Migration Error",
		summaryTemplate: "Data migration for {service} encountered schema compatibility issues.",
	},
	{
		title: "Permission Escalation",
		summaryTemplate: "Unexpected permission escalation detected in {service} access control.",
	},
	{
		title: "Health Check Flapping",
		summaryTemplate: "Health checks for {service} instances flapping between healthy/unhealthy.",
	},
];

function randomFrom<T>(arr: T[]): T {
	return arr[Math.floor(Math.random() * arr.length)]!;
}

function randomDate(daysBack: number): Date {
	const now = new Date();
	const pastMs = daysBack * 24 * 60 * 60 * 1000;
	return new Date(now.getTime() - Math.random() * pastMs);
}

function weightedSeverity(): Severity {
	const r = Math.random();
	if (r < 0.15) return "SEV1";
	if (r < 0.35) return "SEV2";
	if (r < 0.65) return "SEV3";
	return "SEV4";
}

function weightedStatus(): Status {
	const r = Math.random();
	if (r < 0.4) return "OPEN";
	if (r < 0.65) return "MITIGATED";
	return "RESOLVED";
}

async function seed() {
	log.info("Seeding database...");

	const deleted = await db.incident.deleteMany();
	log.info(`Cleared ${deleted.count} existing incidents`);

	const incidents = Array.from({ length: 200 }, (_, i) => {
		const template = randomFrom(INCIDENT_TEMPLATES);
		const service = randomFrom(SERVICES);
		const createdAt = randomDate(90);

		const qualifiers = ["", "", "", ` (#${i + 1})`, ` - ${service}`, ` (Recurring)`];
		const title = template.title + randomFrom(qualifiers);

		const hasSummary = Math.random() > 0.2;
		const summary = hasSummary ? template.summaryTemplate.replace("{service}", service) : null;

		return {
			title,
			service,
			severity: weightedSeverity(),
			status: weightedStatus(),
			owner: randomFrom(OWNERS),
			summary,
			createdAt,
			updatedAt: createdAt,
		};
	});

	const created = await db.incident.createMany({ data: incidents });
	log.info(`Created ${created.count} incidents`);
	log.info("Seed complete!");
}

seed()
	.catch((error) => {
		log.error(error, "Seed failed");
		process.exit(1);
	})
	.finally(async () => {
		process.exit(0);
	});
