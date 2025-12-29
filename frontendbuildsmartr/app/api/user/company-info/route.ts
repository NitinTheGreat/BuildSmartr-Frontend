import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user || !user.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { companyInfo } = body;

    if (typeof companyInfo !== "string") {
      return NextResponse.json({ error: "Invalid company info" }, { status: 400 });
    }

    // Upsert to user_info table
    const { error } = await supabase
      .from("user_info")
      .upsert(
        {
          email: user.email,
          user_company_info: companyInfo,
        },
        {
          onConflict: "email",
        }
      );

    if (error) {
      console.error("[Company Info] Database error:", error);
      return NextResponse.json({ error: "Failed to save company info" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[Company Info] Unexpected error:", err);
    return NextResponse.json({ error: "Unexpected error" }, { status: 500 });
  }
}

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user || !user.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { data, error } = await supabase
      .from("user_info")
      .select("user_company_info")
      .eq("email", user.email)
      .single();

    if (error && error.code !== "PGRST116") { // PGRST116 = no rows returned
      console.error("[Company Info] Database error:", error);
      return NextResponse.json({ error: "Failed to fetch company info" }, { status: 500 });
    }

    return NextResponse.json({ companyInfo: data?.user_company_info || null });
  } catch (err) {
    console.error("[Company Info] Unexpected error:", err);
    return NextResponse.json({ error: "Unexpected error" }, { status: 500 });
  }
}
