import type { Incident, Prisma } from "@prisma/client";
import { db } from "../db";

export interface ListIncidentsParams {
	page?: number;
	pageSize?: number;
	search?: string;
	service?: string;
	severity?: ("SEV1" | "SEV2" | "SEV3" | "SEV4")[];
	status?: ("OPEN" | "MITIGATED" | "RESOLVED")[];
	sortBy?: string;
	sortOrder?: "asc" | "desc";
}

export interface PaginationMeta {
	page: number;
	pageSize: number;
	total: number;
	totalPages: number;
}

export interface PaginatedIncidents {
	incidents: Incident[];
	pagination: PaginationMeta;
}

export interface CreateIncidentData {
	title: string;
	service: string;
	severity: "SEV1" | "SEV2" | "SEV3" | "SEV4";
	status?: "OPEN" | "MITIGATED" | "RESOLVED";
	owner?: string | null;
	summary?: string | null;
}

export interface UpdateIncidentData {
	title?: string;
	service?: string;
	severity?: "SEV1" | "SEV2" | "SEV3" | "SEV4";
	status?: "OPEN" | "MITIGATED" | "RESOLVED";
	owner?: string | null;
	summary?: string | null;
}

const VALID_SORT_COLUMNS = [
	"title",
	"service",
	"severity",
	"status",
	"createdAt",
	"updatedAt",
	"owner",
];

export const incidentRepository = {
	async findMany(params: ListIncidentsParams = {}): Promise<PaginatedIncidents> {
		const page = params.page ?? 1;
		const pageSize = params.pageSize ?? 10;
		const skip = (page - 1) * pageSize;

		const where: Prisma.IncidentWhereInput = {};

		if (params.search) {
			where.OR = [
				{ title: { contains: params.search, mode: "insensitive" } },
				{ summary: { contains: params.search, mode: "insensitive" } },
			];
		}

		if (params.service) {
			where.service = params.service;
		}

		if (params.severity && params.severity.length > 0) {
			where.severity = { in: params.severity };
		}

		if (params.status && params.status.length > 0) {
			where.status = { in: params.status };
		}

		const sortBy = params.sortBy ?? "createdAt";
		const sortOrder = params.sortOrder ?? "desc";
		const orderByColumn = VALID_SORT_COLUMNS.includes(sortBy) ? sortBy : "createdAt";
		const orderBy: Prisma.IncidentOrderByWithRelationInput = {
			[orderByColumn]: sortOrder,
		};

		const [incidents, total] = await Promise.all([
			db.incident.findMany({ where, orderBy, skip, take: pageSize }),
			db.incident.count({ where }),
		]);

		return {
			incidents,
			pagination: {
				page,
				pageSize,
				total,
				totalPages: Math.ceil(total / pageSize),
			},
		};
	},

	async findById(id: string): Promise<Incident | null> {
		return db.incident.findUnique({ where: { id } });
	},

	async create(data: CreateIncidentData): Promise<Incident> {
		return db.incident.create({
			data: {
				title: data.title,
				service: data.service,
				severity: data.severity,
				status: data.status ?? "OPEN",
				owner: data.owner ?? null,
				summary: data.summary ?? null,
			},
		});
	},

	async update(id: string, data: UpdateIncidentData): Promise<Incident> {
		return db.incident.update({
			where: { id },
			data: {
				...(data.title !== undefined && { title: data.title }),
				...(data.service !== undefined && { service: data.service }),
				...(data.severity !== undefined && { severity: data.severity }),
				...(data.status !== undefined && { status: data.status }),
				...(data.owner !== undefined && { owner: data.owner }),
				...(data.summary !== undefined && { summary: data.summary }),
			},
		});
	},
};
