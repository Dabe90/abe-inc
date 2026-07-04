import { z } from 'genkit';
import { ai } from '../../genkit.config.js';

/** Smoke-test flow for `genkit start` and Developer UI. */
export const helloGenkitFlow = ai.defineFlow(
  {
    name: 'helloGenkit',
    inputSchema: z.string().describe('Name or team to greet'),
    outputSchema: z.string(),
  },
  async (name) => {
    const { text } = await ai.generate({
      prompt: `In one friendly sentence, greet ${name} from Abe Stack — a studio that builds production agentic AI on Firebase.`,
    });
    return text;
  },
);
