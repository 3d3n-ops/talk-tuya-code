import { Groq } from "groq-sdk";
import { headers } from "next/headers";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();
    const latestMessage = messages[messages.length - 1].content;

    // Make sure your backend server is running on port 8000
    const response = await fetch("http://127.0.0.1:8000/query-codebase/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messages: messages,
        query: latestMessage,
      }),
      // Add these options for better error handling
      cache: "no-store",
      next: { revalidate: 0 },
    });

    if (!response.ok) {
      throw new Error(`Backend API request failed: ${response.status}`);
    }

    const data = await response.json();

    return new Response(
      JSON.stringify({
        response: data.response,
      }),
      {
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({
        error: "Failed to process message",
        details: error instanceof Error ? error.message : String(error),
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
