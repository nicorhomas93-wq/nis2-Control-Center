import { NextResponse } from "next/server";
import { registerInviteUser } from "@/lib/auth/register-invite";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { token, email, password } = body ?? {};

    if (!token || !email || !password) {
      return NextResponse.json(
        { error: "token, email und password erforderlich" },
        { status: 400 }
      );
    }

    const result = await registerInviteUser({ token, email, password });

    if (!result.ok) {
      return NextResponse.json(
        { error: result.error, suggestLogin: result.suggestLogin ?? false },
        { status: 400 }
      );
    }

    return NextResponse.json({
      ok: true,
      created: result.created,
      message: result.created
        ? "Konto erstellt. Sie können sich jetzt anmelden."
        : "Konto aktualisiert. Sie können sich jetzt anmelden.",
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Registrierung fehlgeschlagen.",
      },
      { status: 500 }
    );
  }
}
