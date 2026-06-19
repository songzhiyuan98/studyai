const PLACEHOLDER_KEYS = new Set([
  '',
  'sk-your-openai-api-key-here',
  'your-openai-api-key',
]);

export type EmbeddingInput = {
  id: string;
  text: string;
};

export type EmbeddingResult = {
  id: string;
  embedding: number[];
};

export function getEmbeddingConfig() {
  return {
    apiKey: process.env.OPENAI_API_KEY || '',
    baseUrl: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
    model: process.env.OPENAI_MODEL_EMBEDDING || 'text-embedding-3-small',
  };
}

export function isEmbeddingConfigured() {
  const { apiKey } = getEmbeddingConfig();
  return apiKey.startsWith('sk-') && !PLACEHOLDER_KEYS.has(apiKey);
}

export async function createEmbeddings(inputs: EmbeddingInput[]): Promise<EmbeddingResult[]> {
  if (inputs.length === 0 || !isEmbeddingConfigured()) {
    return [];
  }

  const { apiKey, baseUrl, model } = getEmbeddingConfig();
  const response = await fetch(`${baseUrl.replace(/\/$/, '')}/embeddings`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      input: inputs.map((input) => input.text),
    }),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw new Error(`Embedding request failed: ${response.status} ${detail}`.trim());
  }

  const payload = await response.json() as {
    data?: Array<{
      index: number;
      embedding: number[];
    }>;
  };

  return (payload.data || [])
    .filter((item) => Array.isArray(item.embedding) && inputs[item.index])
    .map((item) => ({
      id: inputs[item.index].id,
      embedding: item.embedding,
    }));
}
