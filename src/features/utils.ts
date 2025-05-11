import { server } from "../server";
import { z } from "zod";

server.tool(
  "calc_expressions",
  "Calculates the results of the expressions.",
  { expressions: z.array(z.string()).describe("expressions") },
  async ({ expressions }) => {
    const result = expressions.map((expression) => ({
      expression: expression,
      result: new Function(`return ${expression}`)(),
    }));
    return {
      content: [
        {
          type: "text",
          text: `Calculated successfully.\n\n${JSON.stringify(result)}`,
        },
      ],
    };
  }
);

server.tool(
  "count_characters",
  "Counts the number of characters in each line.",
  { lines: z.array(z.string()).describe("Lines") },
  async ({ lines }) => {
    const result = lines.map((line) => {
      return {
        line: line,
        count: line.length,
      };
    });
    return {
      content: [
        {
          type: "text",
          text: `Counted successfully.\n\n${JSON.stringify(result)}`,
        },
      ],
    };
  }
);
