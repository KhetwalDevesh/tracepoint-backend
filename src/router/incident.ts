import { Elysia, t } from "elysia";
import { incidentRepository } from "../repositories";

export const incidentRouter = new Elysia({
	prefix: "/incidents",
	tags: ["Incidents"],
})
	.get(
		"/",
		async ({ query }) => {
			const severity = query.severity
				? (query.severity.split(",").filter(Boolean) as ("SEV1" | "SEV2" | "SEV3" | "SEV4")[])
				: undefined;

			const status = query.status
				? (query.status.split(",").filter(Boolean) as ("OPEN" | "MITIGATED" | "RESOLVED")[])
				: undefined;

			return incidentRepository.findMany({
				page: query.page,
				pageSize: query.pageSize,
				search: query.search,
				service: query.service,
				severity,
				status,
				sortBy: query.sortBy,
				sortOrder: query.sortOrder,
			});
		},
		{
			query: t.Object({
				page: t.Optional(t.Number({ minimum: 1, default: 1 })),
				pageSize: t.Optional(t.Number({ minimum: 1, maximum: 100, default: 10 })),
				search: t.Optional(t.String()),
				service: t.Optional(t.String()),
				severity: t.Optional(t.String()),
				status: t.Optional(t.String()),
				sortBy: t.Optional(t.String()),
				sortOrder: t.Optional(t.Union([t.Literal("asc"), t.Literal("desc")], { default: "desc" })),
			}),
			detail: {
				summary: "List incidents",
				description:
					"Fetch incidents with server-side pagination, filtering by service/severity/status, text search, and sorting.",
			},
		},
	)

	.get(
		"/:id",
		async ({ params, set }) => {
			const incident = await incidentRepository.findById(params.id);

			if (!incident) {
				set.status = 404;
				return { error: "Incident not found" };
			}

			return { incident };
		},
		{
			params: t.Object({
				id: t.String({ format: "uuid" }),
			}),
			detail: {
				summary: "Get incident by ID",
				description: "Fetch a single incident by its UUID.",
			},
		},
	)

	.post(
		"/",
		async ({ body }) => {
			const incident = await incidentRepository.create(body);
			return { incident };
		},
		{
			body: t.Object({
				title: t.String({ minLength: 1 }),
				service: t.String({ minLength: 1 }),
				severity: t.Union([
					t.Literal("SEV1"),
					t.Literal("SEV2"),
					t.Literal("SEV3"),
					t.Literal("SEV4"),
				]),
				status: t.Optional(
					t.Union([t.Literal("OPEN"), t.Literal("MITIGATED"), t.Literal("RESOLVED")]),
				),
				owner: t.Optional(t.String()),
				summary: t.Optional(t.String()),
			}),
			detail: {
				summary: "Create a new incident",
				description: "Create a new incident with title, service, severity, and optional fields.",
			},
		},
	)

	.patch(
		"/:id",
		async ({ params, body, set }) => {
			const existing = await incidentRepository.findById(params.id);

			if (!existing) {
				set.status = 404;
				return { error: "Incident not found" };
			}

			const incident = await incidentRepository.update(params.id, body);
			return { incident };
		},
		{
			params: t.Object({
				id: t.String({ format: "uuid" }),
			}),
			body: t.Object({
				title: t.Optional(t.String({ minLength: 1 })),
				service: t.Optional(t.String({ minLength: 1 })),
				severity: t.Optional(
					t.Union([t.Literal("SEV1"), t.Literal("SEV2"), t.Literal("SEV3"), t.Literal("SEV4")]),
				),
				status: t.Optional(
					t.Union([t.Literal("OPEN"), t.Literal("MITIGATED"), t.Literal("RESOLVED")]),
				),
				owner: t.Optional(t.Nullable(t.String())),
				summary: t.Optional(t.Nullable(t.String())),
			}),
			detail: {
				summary: "Update an incident",
				description: "Update one or more fields of an existing incident.",
			},
		},
	);
