/**
 * Seed a demo vehicle + active tag so PDF uploads work without Magic Link.
 *
 * Usage:
 *   npm run db:seed-demo
 */

const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()?.replace(/\/$/, "");
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

const DEMO_EMAIL = "demo@zeloxtag.local";
const DEMO_PASSWORD = "zeloxtag-demo-password";
const DEMO_TAG_UUID = "demo-active-tag";
const DEMO_VEHICLE_ID = "11111111-1111-4111-8111-111111111111";

if (!url || !serviceKey) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in env.",
  );
  process.exit(1);
}

const headers = {
  apikey: serviceKey,
  Authorization: `Bearer ${serviceKey}`,
  "Content-Type": "application/json",
};

async function readJson(res) {
  const text = await res.text();
  try {
    return { status: res.status, body: JSON.parse(text) };
  } catch {
    return { status: res.status, body: text };
  }
}

async function ensureBucket() {
  const list = await readJson(await fetch(`${url}/storage/v1/bucket`, { headers }));
  const names = Array.isArray(list.body) ? list.body.map((b) => b.name) : [];
  if (names.includes("vehicle-documents")) return;

  const created = await readJson(
    await fetch(`${url}/storage/v1/bucket`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        id: "vehicle-documents",
        name: "vehicle-documents",
        public: true,
        file_size_limit: 26214400,
        allowed_mime_types: [
          "application/pdf",
          "image/jpeg",
          "image/png",
          "image/webp",
          "image/heic",
          "image/heif",
        ],
      }),
    }),
  );
  if (created.status >= 400) {
    throw new Error(`bucket: ${JSON.stringify(created.body)}`);
  }
}

async function ensureUser() {
  const listed = await readJson(
    await fetch(`${url}/auth/v1/admin/users?page=1&per_page=200`, { headers }),
  );
  if (listed.status >= 400) {
    throw new Error(`listUsers: ${JSON.stringify(listed.body)}`);
  }
  const users = listed.body.users || [];
  const existing = users.find(
    (user) => (user.email || "").toLowerCase() === DEMO_EMAIL,
  );
  if (existing) return existing.id;

  const created = await readJson(
    await fetch(`${url}/auth/v1/admin/users`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        email: DEMO_EMAIL,
        password: DEMO_PASSWORD,
        email_confirm: true,
        user_metadata: { name: "ZeloxTag Demo" },
      }),
    }),
  );
  if (created.status >= 400) {
    throw new Error(`createUser: ${JSON.stringify(created.body)}`);
  }
  return created.body.id || created.body.user?.id;
}

async function upsertVehicle(userId) {
  const result = await readJson(
    await fetch(`${url}/rest/v1/vehicles?on_conflict=id`, {
      method: "POST",
      headers: {
        ...headers,
        Prefer: "resolution=merge-duplicates,return=minimal",
      },
      body: JSON.stringify({
        id: DEMO_VEHICLE_ID,
        user_id: userId,
        make: "BMW",
        model: "328i",
        year: 1995,
        vin: "WBABA9105SAL123456",
        tech_specs: {
          engine: "2.8 M52",
          powerPs: 193,
          powerKw: 142,
          torqueNm: 298,
          displacementCc: 2793,
          fuelType: "Benzin",
          transmission: "5-Gang manuell",
          drivetrain: "Heckantrieb",
          color: "Arctissilber Metallic",
          bodyType: "Coupé",
          notes: "E36 · Widebody · GT-Flügel · KW V1 · BBS LM",
          dynoChartUrl: "/demo/dyno-e36.svg",
        },
      }),
    }),
  );
  if (result.status >= 400) {
    throw new Error(`vehicle: ${JSON.stringify(result.body)}`);
  }
}

async function ensureTag(uuid, payload) {
  const lookup = await readJson(
    await fetch(
      `${url}/rest/v1/tags?uuid=eq.${encodeURIComponent(uuid)}&select=id`,
      { headers },
    ),
  );
  const existing = Array.isArray(lookup.body) ? lookup.body[0] : null;

  if (existing?.id) {
    const updated = await readJson(
      await fetch(`${url}/rest/v1/tags?id=eq.${existing.id}`, {
        method: "PATCH",
        headers: { ...headers, Prefer: "return=minimal" },
        body: JSON.stringify(payload),
      }),
    );
    if (updated.status >= 400) {
      throw new Error(`tag update (${uuid}): ${JSON.stringify(updated.body)}`);
    }
    return;
  }

  const inserted = await readJson(
    await fetch(`${url}/rest/v1/tags`, {
      method: "POST",
      headers: { ...headers, Prefer: "return=minimal" },
      body: JSON.stringify({ uuid, ...payload }),
    }),
  );
  if (inserted.status >= 400) {
    throw new Error(`tag insert (${uuid}): ${JSON.stringify(inserted.body)}`);
  }
}

async function main() {
  await ensureBucket();
  const userId = await ensureUser();
  await upsertVehicle(userId);
  await ensureTag(DEMO_TAG_UUID, {
    vehicle_id: DEMO_VEHICLE_ID,
    status: "active",
  });
  await ensureTag("demo-unclaimed-tag", {
    vehicle_id: null,
    status: "unclaimed",
  });
  console.log("Demo seed OK");
  console.log(`  active:    /v/${DEMO_TAG_UUID}`);
  console.log(`  unclaimed: /v/demo-unclaimed-tag`);
  console.log(`  vehicle:   ${DEMO_VEHICLE_ID}`);
  console.log(`  user:      ${DEMO_EMAIL}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
