import "server-only";

const AUTHORITY = "https://login.microsoftonline.com/common";
const GRAPH_BASE = "https://graph.microsoft.com/v1.0";

export const MICROSOFT_OAUTH_STATE_COOKIE = "m365_oauth_state";

// Delegated scopes: real, working values, matching what the wizard already
// advertises to the user (Group.Read.All / ChannelMessage.Send need admin
// consent for most tenants, so they're kept out of the MVP scope request —
// asking for permissions the app doesn't yet use would just make consent
// harder without any benefit).
const SCOPES = ["openid", "profile", "email", "offline_access", "User.Read.All", "Sites.Read.All"];

export function isMicrosoftOAuthConfigured(): boolean {
  return Boolean(
    process.env.MICROSOFT_CLIENT_ID && process.env.MICROSOFT_CLIENT_SECRET && process.env.NEXT_PUBLIC_APP_URL
  );
}

export function getMicrosoftRedirectUri(): string {
  const base = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? "";
  return `${base}/api/integrations/microsoft365/callback`;
}

export function buildMicrosoftAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: process.env.MICROSOFT_CLIENT_ID!,
    response_type: "code",
    redirect_uri: getMicrosoftRedirectUri(),
    response_mode: "query",
    scope: SCOPES.join(" "),
    state,
    prompt: "select_account",
  });
  return `${AUTHORITY}/oauth2/v2.0/authorize?${params.toString()}`;
}

interface MicrosoftTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type: string;
}

async function requestToken(body: URLSearchParams): Promise<MicrosoftTokenResponse> {
  const res = await fetch(`${AUTHORITY}/oauth2/v2.0/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Microsoft-Token-Austausch fehlgeschlagen: ${text}`);
  }
  return res.json();
}

export function exchangeMicrosoftCode(code: string): Promise<MicrosoftTokenResponse> {
  return requestToken(
    new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: getMicrosoftRedirectUri(),
      client_id: process.env.MICROSOFT_CLIENT_ID!,
      client_secret: process.env.MICROSOFT_CLIENT_SECRET!,
      scope: SCOPES.join(" "),
    })
  );
}

export function refreshMicrosoftToken(refreshToken: string): Promise<MicrosoftTokenResponse> {
  return requestToken(
    new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      client_id: process.env.MICROSOFT_CLIENT_ID!,
      client_secret: process.env.MICROSOFT_CLIENT_SECRET!,
      scope: SCOPES.join(" "),
    })
  );
}

async function graphGet<T>(accessToken: string, path: string): Promise<T> {
  const res = await fetch(`${GRAPH_BASE}${path}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Microsoft Graph Fehler (${res.status}) bei ${path}: ${text}`);
  }
  return res.json();
}

export interface MicrosoftOrganization {
  id: string;
  displayName: string;
}

export function fetchMicrosoftOrganization(accessToken: string) {
  return graphGet<{ value: MicrosoftOrganization[] }>(accessToken, "/organization?$select=id,displayName").then(
    (r) => r.value[0] ?? null
  );
}

export interface MicrosoftUser {
  id: string;
  displayName: string;
  mail: string | null;
  department: string | null;
  jobTitle: string | null;
}

export async function fetchMicrosoftUsers(accessToken: string, top = 200): Promise<MicrosoftUser[]> {
  const result = await graphGet<{ value: MicrosoftUser[] }>(
    accessToken,
    `/users?$select=id,displayName,mail,department,jobTitle&$top=${top}`
  );
  return result.value;
}

export interface MicrosoftSite {
  id: string;
  name: string;
  webUrl: string;
}

export async function fetchMicrosoftSites(accessToken: string): Promise<MicrosoftSite[]> {
  const result = await graphGet<{ value: MicrosoftSite[] }>(accessToken, "/sites?search=*");
  return result.value;
}
