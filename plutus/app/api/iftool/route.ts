import { GoogleGenerativeAI } from "@google/generative-ai";
import { SchemaType } from "@google/generative-ai/server";
import { NextRequest, NextResponse } from "next/server";

const genAI = new GoogleGenerativeAI(process.env.FLASH_API_KEY);

const schema = {
  description: "Determine if a tool is needed based on the presence of key variables (like private keys) in the user's query.",
  type: SchemaType.OBJECT,
  properties: {
    detectTool: {
      type: SchemaType.BOOLEAN,
      description: "Return true if the user's query lacks key variables (like private keys), indicating a tool call is needed. Return false if the query includes key variables, indicating a tool call is not needed.",
      nullable: false,
    },
  },
  required: ["detectTool"],
};

const model = genAI.getGenerativeModel({
  model: "gemini-2.0-flash",
  generationConfig: {
    responseMimeType: "application/json",
    responseSchema: schema,
  }
});


export async function POST(req: NextRequest) {
  const { value, intent } = await req.json();
  console.log("Value: ", value);
  console.log("Intenttt: ", intent);

  // Regex-based key detection (example)
  const keyPattern = /<key>\s*\w+/i; // Adjust regex as needed
  const hasKeys = keyPattern.test(value);
  console.log(JSON.parse(intent))
  const isGen = JSON.parse(intent).intent === "General Query";
  console.log("Is gen: ", isGen);

  // Enhanced prompting
  const enhancedValue = `Determine if a tool is needed based on the presence of key variables (like private keys) in the following query: "${value}" Do not do a tool calling if its a general query.`;

  const result = await model.generateContent(enhancedValue);
  console.log("Response:", result.response.text());
  const responseText = result.response.text();
  const jsonData = JSON.parse(responseText);

  // Override Gemini's response if regex detects keys
  if (hasKeys || isGen) {
    jsonData.detectTool = false; // Override to false if keys are found
  }

  return NextResponse.json(jsonData);
}
