import { GoogleGenerativeAI } from "@google/generative-ai";

export async function POST(req) {
  const { prompt } = await req.json();

  if (!prompt) {
    return new Response(JSON.stringify({ error: "Prompt is required" }), {
      status: 400,
    });
  }

  const googleApiKey = process.env.GOOGLE_API_KEY || "";
  const genAI = new GoogleGenerativeAI(googleApiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

  try {
    const result = await model.generateContent(prompt);

    return new Response(JSON.stringify({ response: result.response.text() }), {
      status: 200,
    });
  } catch (error) {
    console.error("Error generating content:", error);

    return new Response(
      JSON.stringify({ error: "Failed to generate content" }),
      { status: 500 },
    );
  }
}
