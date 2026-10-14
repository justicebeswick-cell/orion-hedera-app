export type ImageConfig = { baseURL: string; apiKey: string; model: string; format: "openai" };

export const imageSettings: Omit<ImageConfig, "apiKey"> = {
  baseURL: "https://ai.gateway.lovable.dev",
  model: "openai/gpt-image-2.5-sunburst",
  format: "openai",
};

export function generateImage(config: ImageConfig, prompt: string, stream = true, signal?: AbortSignal) {
  return fetch(`${config.baseURL}/v1/images/generations`, {
    method: "POST",
    headers: { Authorization: `Bearer ${config.apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: config.model, prompt, ...(stream ? { stream: true, partial_images: 1 } : {}) }),
    signal: signal ?? null,
  });
}
