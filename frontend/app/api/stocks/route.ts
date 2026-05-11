import { NextResponse } from "next/server";

const backendBaseUrl = process.env.BACKEND_API_URL;

export async function GET(request: Request) {
  if (!backendBaseUrl) {
    return NextResponse.json(
      { error: "BACKEND_API_URL is not configured." },
      { status: 500 }
    );
  }

  const { search } = new URL(request.url);
  const response = await fetch(`${backendBaseUrl}/stocks${search}`, {
    next: { revalidate: 0 }
  });

  if (!response.ok) {
    return NextResponse.json(
      { error: "Upstream backend request failed." },
      { status: response.status }
    );
  }

  const data = await response.json();
  return NextResponse.json(data);
}

