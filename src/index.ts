/**
 * Genkit entry — re-exports agents, tools, and flows for Firebase Functions or dev UI.
 */
export { ai, DEFAULT_GEMINI_MODEL, initFirebaseTelemetry } from '../genkit.config.js';
export { opsAssistantAgent } from './agents/ops-assistant.js';
export { recordInquiryTool } from './tools/record-inquiry.js';
export { helloGenkitFlow } from './flows/hello-flow.js';
export { triageInquiryFlow } from './flows/triage-inquiry.js';
