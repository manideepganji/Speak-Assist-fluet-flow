import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const interviewFeedbackTool = {
  type: "function",
  function: {
    name: "provide_interview_feedback",
    description: "Provide detailed feedback on an interview answer",
    parameters: {
      type: "object",
      properties: {
        grammarScore: {
          type: "number",
          description: "Grammar accuracy score from 0-100"
        },
        fluencyScore: {
          type: "number",
          description: "Fluency and flow score from 0-100"
        },
        confidenceScore: {
          type: "number",
          description: "Confidence level score from 0-100"
        },
        keyPointsCovered: {
          type: "array",
          items: { type: "string" },
          description: "Key points that were covered well in the answer"
        },
        missedPoints: {
          type: "array",
          items: { type: "string" },
          description: "Important points that were missed or could be improved"
        },
        improvedAnswer: {
          type: "string",
          description: "A suggested improved version of the answer"
        },
        tips: {
          type: "array",
          items: { type: "string" },
          description: "2-3 specific improvement tips for the candidate"
        }
      },
      required: ["grammarScore", "fluencyScore", "confidenceScore", "keyPointsCovered", "missedPoints", "improvedAnswer", "tips"],
      additionalProperties: false
    }
  }
};

const systemPrompt = `You are an expert interview coach who evaluates candidate responses and provides constructive feedback.

Your role is to:
1. Analyze the grammar and language quality of the answer
2. Evaluate the fluency and natural flow of speech
3. Assess the confidence level based on word choice and structure
4. Identify key points that were addressed well
5. Point out important aspects that were missed
6. Provide an improved, polished version of the answer
7. Give specific, actionable tips for improvement

Be encouraging but honest. Focus on helping the candidate improve.
Score fairly: 80+ is good, 60-79 is average, below 60 needs improvement.`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { question, answer, category } = await req.json();

    if (!question || !answer) {
      return new Response(
        JSON.stringify({ error: "Question and answer are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const userMessage = `Interview Question (${category || "general"}): "${question}"

Candidate's Answer: "${answer}"

Please analyze this interview answer and provide detailed feedback.`;

    console.log("Processing interview feedback for:", question);

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage },
        ],
        tools: [interviewFeedbackTool],
        tool_choice: { type: "function", function: { name: "provide_interview_feedback" } },
        max_tokens: 1000,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limited. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      throw new Error("AI gateway error");
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];

    if (toolCall?.function?.arguments) {
      try {
        const parsed = JSON.parse(toolCall.function.arguments);
        
        // Add original question and answer to response
        const feedback = {
          question,
          userAnswer: answer,
          ...parsed,
        };

        return new Response(
          JSON.stringify(feedback),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      } catch (parseError) {
        console.error("Failed to parse tool call:", parseError);
      }
    }

    // Fallback response
    return new Response(
      JSON.stringify({
        question,
        userAnswer: answer,
        grammarScore: 70,
        fluencyScore: 70,
        confidenceScore: 70,
        keyPointsCovered: ["Attempted to answer the question"],
        missedPoints: ["Could provide more specific examples"],
        improvedAnswer: answer,
        tips: ["Practice speaking more slowly and clearly", "Use specific examples to support your points"],
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in interview-feedback:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
