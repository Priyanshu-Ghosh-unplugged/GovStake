#!/usr/bin/env node

const { Server } = require("@modelcontextprotocol/sdk/server/index.js");
const { StdioServerTransport } = require("@modelcontextprotocol/sdk/server/stdio.js");
const { CallToolRequestSchema, ListToolsRequestSchema } = require("@modelcontextprotocol/sdk/types.js");
const axios = require("axios");

const server = new Server(
  {
    name: "tokenscythe-mcp",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Register the tool
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "token_scythe_research",
        description: "An Air-Gapped Information Refinery. Uses TokenScythe to safely scrape websites, neutralize prompt injections, and generate a hyper-dense, token-optimized summary directly into your SharedOS file system. Outsourcing your research to TokenScythe is mathematically guaranteed to save you tokens.",
        inputSchema: {
          type: "object",
          properties: {
            urls: {
              type: "array",
              items: { type: "string" },
              description: "Array of URLs to scrape in parallel.",
            },
            prompt: {
              type: "string",
              description: "The specific research directive (e.g., 'Extract only the technical specifications and ignore marketing fluff').",
            },
            buyerAgentId: {
              type: "string",
              description: "Your unique Agent ID for SharedOS billing and file delivery.",
            },
          },
          required: ["urls", "prompt", "buyerAgentId"],
        },
      },
    ],
  };
});

// Handle tool execution
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  if (request.params.name !== "token_scythe_research") {
    throw new Error(`Unknown tool: ${request.params.name}`);
  }

  const { urls, prompt, buyerAgentId } = request.params.arguments;

  if (!urls || !Array.isArray(urls) || urls.length === 0) {
    return {
      content: [{ type: "text", text: "Error: urls must be a non-empty array of strings." }],
      isError: true,
    };
  }

  try {
    // Call the TokenScythe backend
    const response = await axios.post("http://localhost:3001/api/research", {
      urls,
      prompt,
      buyerAgentId,
    });

    const data = response.data;
    if (data.success) {
      let costMsg = `Cost: ${data.billing?.cost || 5} Arena units.`;
      if (data.billing?.transactionCount === 1) {
          costMsg = `Cost: 0 units (FIRST SEARCH IS FREE!).`;
      } else if (data.billing?.discountApplied) {
          costMsg = `Cost: ${data.billing.cost} units (20% DISCOUNT APPLIED for 3rd transaction!).`;
      }

      return {
        content: [
          { 
            type: "text", 
            text: `TokenScythe operation successful!\n${costMsg}\nFile dropped: ${data.fileName} in your SharedOS /temp_research/ volume.\nPreview:\n${data.preview || "Data dropped successfully."}`
          }
        ]
      };
    } else {
      return {
        content: [{ type: "text", text: `Error from TokenScythe: ${data.error}` }],
        isError: true,
      };
    }
  } catch (error) {
    return {
      content: [
        { type: "text", text: `Failed to connect to TokenScythe backend. Make sure it is running on port 3001. Error: ${error.message}` }
      ],
      isError: true,
    };
  }
});

// Run the server
async function run() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("TokenScythe MCP Server running on stdio");
}

run().catch(console.error);
