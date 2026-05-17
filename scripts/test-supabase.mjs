import fs from "node:fs";
import path from "node:path";

const envPath = path.join(process.cwd(), ".env.local");
const env = Object.fromEntries(
  fs
    .readFileSync(envPath, "utf8")
    .split(/\r?\n/)
    .filter((line) => line && !line.trim().startsWith("#") && line.includes("="))
    .map((line) => {
      const index = line.indexOf("=");
      return [line.slice(0, index), line.slice(index + 1).trim()];
    })
);

const supabaseUrl = env.SUPABASE_URL?.replace(/\/rest\/v1\/?$/, "").replace(/\/$/, "");
const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

if (supabaseKey.startsWith("eyJ")) {
  const payload = JSON.parse(Buffer.from(supabaseKey.split(".")[1], "base64url").toString("utf8"));
  console.log(`Supabase JWT role: ${payload.role}`);
  if (payload.role !== "service_role") {
    console.log(
      "This is not a service_role key. Inserts require an RLS insert policy, or replace it with the service_role key."
    );
  }
}

const headers = {
  apikey: supabaseKey,
  "Content-Type": "application/json",
  Prefer: "return=representation"
};

if (!supabaseKey.startsWith("sb_")) {
  headers.Authorization = `Bearer ${supabaseKey}`;
}

const record = {
  name: "Test Enquiry",
  phone: "9999999999",
  vehicle_type: "Test Vehicle",
  tyre_size: "15 Inch",
  service: "Wheel Alignment",
  message: "Inserted from npm run test:supabase",
  created_at: new Date().toISOString()
};

const response = await fetch(`${supabaseUrl}/rest/v1/customer`, {
  method: "POST",
  headers,
  body: JSON.stringify(record)
});

const text = await response.text();

console.log(`Supabase status: ${response.status}`);
if (!response.ok) {
  console.error(text || "No response body returned from Supabase.");
  process.exitCode = 1;
} else {
  console.log(text);
}
