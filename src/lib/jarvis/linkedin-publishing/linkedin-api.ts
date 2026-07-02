import "server-only";

interface PublishTextPostInput {
  accessToken: string;
  memberId: string;
  text: string;
}

interface PublishImagePostInput extends PublishTextPostInput {
  imageUrl: string;
}

function buildPostText(body: string, cta?: string | null, hashtags?: string | null): string {
  const parts = [body.trim()];
  if (cta?.trim()) parts.push("", cta.trim());
  if (hashtags?.trim()) parts.push("", hashtags.trim());
  return parts.join("\n");
}

export async function publishLinkedInTextPost(input: PublishTextPostInput & {
  cta?: string | null;
  hashtags?: string | null;
}): Promise<{ urn: string }> {
  const author = `urn:li:person:${input.memberId}`;
  const commentary = buildPostText(input.text, input.cta, input.hashtags);

  const res = await fetch("https://api.linkedin.com/rest/posts", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${input.accessToken}`,
      "Content-Type": "application/json",
      "X-Restli-Protocol-Version": "2.0.0",
      "LinkedIn-Version": "202401",
    },
    body: JSON.stringify({
      author,
      commentary,
      visibility: "PUBLIC",
      distribution: {
        feedDistribution: "MAIN_FEED",
        targetEntities: [],
        thirdPartyDistributionChannels: [],
      },
      lifecycleState: "PUBLISHED",
      isReshareDisabledByAuthor: false,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`LinkedIn Veröffentlichung fehlgeschlagen: ${text}`);
  }

  const urn = res.headers.get("x-restli-id") ?? res.headers.get("x-linkedin-id") ?? "";
  if (!urn) {
    const data = await res.json().catch(() => ({}));
    const id = (data as { id?: string }).id;
    if (!id) throw new Error("LinkedIn hat keine Post-ID zurückgegeben.");
    return { urn: id };
  }

  return { urn };
}

export async function publishLinkedInImagePost(input: PublishImagePostInput & {
  cta?: string | null;
  hashtags?: string | null;
}): Promise<{ urn: string }> {
  const author = `urn:li:person:${input.memberId}`;
  const commentary = buildPostText(input.text, input.cta, input.hashtags);

  const initRes = await fetch(
    "https://api.linkedin.com/rest/images?action=initializeUpload",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${input.accessToken}`,
        "Content-Type": "application/json",
        "X-Restli-Protocol-Version": "2.0.0",
        "LinkedIn-Version": "202401",
      },
      body: JSON.stringify({
        initializeUploadRequest: { owner: author },
      }),
    }
  );

  if (!initRes.ok) {
    const text = await initRes.text();
    throw new Error(`LinkedIn Bild-Upload Init fehlgeschlagen: ${text}`);
  }

  const initData = (await initRes.json()) as {
    value?: { uploadUrl?: string; image?: string };
  };
  const uploadUrl = initData.value?.uploadUrl;
  const imageUrn = initData.value?.image;
  if (!uploadUrl || !imageUrn) {
    throw new Error("LinkedIn Bild-Upload URL fehlt.");
  }

  const imageRes = await fetch(input.imageUrl);
  if (!imageRes.ok) throw new Error("Beitragsbild konnte nicht geladen werden.");
  const imageBuffer = await imageRes.arrayBuffer();

  const uploadRes = await fetch(uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": "application/octet-stream" },
    body: imageBuffer,
  });

  if (!uploadRes.ok) {
    throw new Error("LinkedIn Bild-Upload fehlgeschlagen.");
  }

  const postRes = await fetch("https://api.linkedin.com/rest/posts", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${input.accessToken}`,
      "Content-Type": "application/json",
      "X-Restli-Protocol-Version": "2.0.0",
      "LinkedIn-Version": "202401",
    },
    body: JSON.stringify({
      author,
      commentary,
      visibility: "PUBLIC",
      distribution: {
        feedDistribution: "MAIN_FEED",
        targetEntities: [],
        thirdPartyDistributionChannels: [],
      },
      content: {
        media: {
          id: imageUrn,
        },
      },
      lifecycleState: "PUBLISHED",
      isReshareDisabledByAuthor: false,
    }),
  });

  if (!postRes.ok) {
    const text = await postRes.text();
    throw new Error(`LinkedIn Veröffentlichung mit Bild fehlgeschlagen: ${text}`);
  }

  const urn = postRes.headers.get("x-restli-id") ?? imageUrn;
  return { urn };
}
