import { NextResponse } from "next/server";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  let email = "";
  try {
    const body = (await request.json()) as { email?: unknown };
    if (typeof body.email === "string") {
      email = body.email.trim().toLowerCase();
    }
  } catch {
    email = "";
  }

  if (!EMAIL_PATTERN.test(email)) {
    return NextResponse.json(
      { error: "Enter a valid email address." },
      { status: 400 },
    );
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "The mailing list is not configured yet. Try again later." },
      { status: 503 },
    );
  }

  /** Scopes contacts to a Resend audience when set; otherwise they land in global contacts. */
  const audienceId = process.env.RESEND_AUDIENCE_ID;
  const endpoint = audienceId
    ? `https://api.resend.com/audiences/${audienceId}/contacts`
    : "https://api.resend.com/contacts";

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, unsubscribed: false }),
  });

  if (!response.ok) {
    console.error(
      "Resend subscribe failed",
      response.status,
      await response.text(),
    );
    return NextResponse.json(
      { error: "Couldn't subscribe. Try again in a moment." },
      { status: 502 },
    );
  }

  return NextResponse.json({ ok: true });
}
