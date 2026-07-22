import { defineTool } from "eve/tools";
import { z } from "zod";
import { getDivisionContext } from "../lib/division-context";

export default defineTool({
  description:
    "Geeft redactionele voorkeuren en metadata terug voor een reeks (divisionKey), zodat je research en ideeën daarop kunt afstemmen.",
  inputSchema: z.object({
    divisionKey: z
      .string()
      .min(1)
      .describe("De Neon-reeks-id (divisionKey) waarvoor je research doet."),
  }),
  async execute({ divisionKey }) {
    return getDivisionContext(divisionKey);
  },
});
