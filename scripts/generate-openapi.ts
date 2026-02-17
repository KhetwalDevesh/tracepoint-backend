const API_URL = process.env.API_URL || "http://localhost:4000";

async function generateOpenAPI() {
	console.log(`Fetching OpenAPI schema from ${API_URL}/openapi/json ...`);

	const res = await fetch(`${API_URL}/openapi/json`);
	if (!res.ok) {
		throw new Error(`Failed to fetch OpenAPI schema: ${res.status} ${res.statusText}`);
	}

	const schema = await res.json();
	const output = "./openapi.json";
	await Bun.write(output, JSON.stringify(schema, null, 2));
	console.log(`✅ OpenAPI schema written to ${output}`);
}

generateOpenAPI().catch((error) => {
	console.error("Failed to generate OpenAPI schema:", error);
	process.exit(1);
});
