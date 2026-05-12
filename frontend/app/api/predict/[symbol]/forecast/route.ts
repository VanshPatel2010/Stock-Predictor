import { NextResponse } from "next/server";

const backendBaseUrl = process.env.BACKEND_API_URL;

type RouteContext = {
  params: {
    symbol: string;
  };
};

export async function GET(request: Request, { params }: RouteContext) {
  if (!backendBaseUrl) {
    return NextResponse.json(
      { error: "BACKEND_API_URL is not configured." },
      { status: 500 }
    );
  }

  const { searchParams } = new URL(request.url);
  const days = searchParams.get("days") ?? "5";

  try {
    const response = await fetch(
      `${backendBaseUrl}/predict/${encodeURIComponent(params.symbol)}/forecast?days=${encodeURIComponent(days)}`,
      { next: { revalidate: 0 } }
    );

    if (!response.ok) {
      const detail = await response.text();
      return NextResponse.json(
        {
          error: "Upstream backend forecast request failed.",
          detail: detail || `Backend responded with ${response.status}.`
        },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      {
        error: `Unable to reach backend at ${backendBaseUrl}.`,
        detail: error instanceof Error ? error.message : "Unknown fetch error."
      },
      { status: 502 }
    );
  }
}
