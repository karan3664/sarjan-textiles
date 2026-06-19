export async function fetchGstCaptcha() {
  const res = await fetch("/api/gst/captcha");
  const data = await res.json();
  return {
    res,
    data: data as {
      sessionId?: string;
      imageBase64?: string;
      mediaType?: string;
      error?: string;
    },
  };
}

export async function verifyGstWithPortal(input: {
  gst: string;
  captcha: string;
  captchaSessionId: string;
}) {
  const res = await fetch("/api/gst/verify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      gst: input.gst,
      captcha: input.captcha.replace(/\D/g, "").slice(0, 6),
      captchaSessionId: input.captchaSessionId,
    }),
  });
  const data = await res.json();
  return {
    res,
    data: data as {
      gst?: {
        gstin: string;
        legalName: string;
        tradeName?: string;
      };
      error?: string;
    },
  };
}
