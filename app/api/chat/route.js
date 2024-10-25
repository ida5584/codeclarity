import { NextResponse } from "next/server";
import OpenAI from "openai";

const systemPrompt = `You are the AI interviewer, conducting technical computer science interviews for software engineering jobs. Your role is to:
                        1) Ask relevant technical questions based on computer science topics (e.g., algorithms, data structures, system design),
                        2) Evaluate and give feedback on coding solutions and problem-solving approaches,
                        3) Provide hints or clarifications when requested, but avoid giving away complete solutions,
                        4) Simulate real-world technical interviews and adapt to the user's skill level,
                        5) Encourage the candidate and keep the tone professional, yet supportive,
                        6) Manage the flow of the interview by progressing through increasingly challenging questions.
                        Ensure responses are clear, concise, and focused on assessing technical skills.`

export async function POST(req){
    const openai = new OpenAI()
    const data = await req.json()

    const completion = await openai.chat.completions.create({
        messages: [
            {
                role: 'system', 
                content: systemPrompt, 
            }, 
            ...data, 
        ], 
        model: "gpt-4o-mini",
        stream: true,
    })

    const stream = new ReadableStream({
        async start(controller){
            const encoder = new TextEncoder()
            try {
                for await (const chunk of completion){
                    const content = chunk.choices[0]?.delta?.content
                    if (content){
                        const text = encoder.encode(content)
                        controller.enqueue(text)
                    }
                }
            } catch (err) {
                controller.error(err)
            } finally {
                controller.close()
            }
        },
    })
    return new NextResponse(stream)
}
