import { NextResponse } from "next/server";

const TABLE_NAME = "customer";

export async function POST(request) {
  const supabaseUrl = process.env.SUPABASE_URL?.replace(/\/rest\/v1\/?$/, "").replace(/\/$/, "");
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json(
      { error: "Supabase environment variables are not configured." },
      { status: 500 }
    );
  }

  if (supabaseUrl.includes("sb_publishable_") || supabaseUrl.includes("sb_secret_")) {
    return NextResponse.json(
      {
        error:
          "SUPABASE_URL is incorrect. Use the Project URL from Supabase settings, not an API key."
      },
      { status: 500 }
    );
  }

  const payload = await request.json().catch(() => null);
  if (!payload?.name || !payload?.phone) {
    return NextResponse.json({ error: "Name and phone are required." }, { status: 400 });
  }

  const enquiry = {
    name: payload.name,
    phone: payload.phone,
    vehicle_type: payload.vehicle || null,
    tyre_size: payload.size || null,
    service: payload.service || null,
    message: payload.msg || null,
    created_at: new Date().toISOString()
  };

  let response;
  try {
    const headers = {
      apikey: supabaseKey,
      "Content-Type": "application/json",
      Prefer: "return=representation"
    };

    if (!supabaseKey.startsWith("sb_")) {
      headers.Authorization = `Bearer ${supabaseKey}`;
    }

    response = await fetch(`${supabaseUrl}/rest/v1/${TABLE_NAME}`, {
      method: "POST",
      headers,
      body: JSON.stringify(enquiry)
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          "Could not reach Supabase. Check that SUPABASE_URL is the exact Project URL from Supabase Project Settings > API.",
        details: error.message
      },
      { status: 502 }
    );
  }

  if (!response.ok) {
    const details = await response.text();
    let supabaseError = {};
    try {
      supabaseError = JSON.parse(details || "{}");
    } catch {}

    if (supabaseError?.code === "42501") {
      return NextResponse.json(
        {
          error:
            "Supabase row-level security is blocking this insert. Add an INSERT policy for anon on public.customer, or use a real service_role key.",
          details
        },
        { status: 403 }
      );
    }

    if (response.status === 401) {
      return NextResponse.json(
        {
          error:
            "Supabase rejected the API key. Replace SUPABASE_SERVICE_ROLE_KEY with a valid secret key from the same Supabase project.",
          details
        },
        { status: 401 }
      );
    }

    if (response.status === 404) {
      return NextResponse.json(
        {
          error: `Supabase table "${TABLE_NAME}" was not found. Check the exact table name and capitalization.`,
          details
        },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: "Unable to store enquiry in Supabase.", details },
      { status: response.status }
    );
  }

  const data = await response.json();
  return NextResponse.json({ ok: true, data });
}
