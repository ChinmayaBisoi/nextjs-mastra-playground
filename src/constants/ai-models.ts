const GPT_4O_MINI = "openai/gpt-4o-mini";

// FREE MODELS
const GPT_OSS_20B = "openrouter/openai/gpt-oss-20b";

export const AI_MODELS = {
  PAID: { GPT_4O_MINI },
  FREE: { GPT_OSS_20B },
} as const;
