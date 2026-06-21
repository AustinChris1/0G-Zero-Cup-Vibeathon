// The live 0G Compute chatbot model every agent currently runs on. There is one
// TEE-backed chat provider on 0G right now, so all agents share it and differ by
// strategy, not base model. Single source of truth for display.
export const RUNTIME_MODEL = "qwen/qwen2.5-omni-7b";
