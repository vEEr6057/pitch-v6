import { experimental_transcribe as transcribe } from "ai"
import { openai } from "@ai-sdk/openai"

export const maxDuration = 60

const ENABLE_SERVER_TRANSCRIBE = process.env.ENABLE_SERVER_TRANSCRIBE === "1"

export async function POST(req: Request) {
  try {
    const contentType = req.headers.get("content-type") || ""
    if (!contentType.includes("multipart/form-data")) {
      return new Response("Expected multipart/form-data", { status: 400 })
    }

    const form = await req.formData()
    const file = form.get("audio")
    if (!file || !(file instanceof File)) {
      return new Response("Missing audio file", { status: 400 })
    }

    const arrayBuffer = await file.arrayBuffer()
    const bytes = new Uint8Array(arrayBuffer)
    const mime = file.type || "audio/webm"

    const approxSize = (file as any).size ?? bytes.length
    if (!approxSize || approxSize < 50) {
      // Tiny/empty recording; allow text-only path with a clear hint
      return Response.json({
        text: "",
        warning: "No speech detected in recording. You can type your transcript and continue.",
      })
    }

    const audioBlob = new Blob([bytes], { type: mime })

    if (!ENABLE_SERVER_TRANSCRIBE) {
      return Response.json({
        text: "",
        warning:
          "Server transcription is disabled in free mode. Use Browser Transcription or paste your transcript and continue.",
      })
    }

    const result = await transcribe({
      model: openai.transcription("whisper-1"),
      audio: audioBlob,
      language: "en",
    })

    const text = (result.text || "").trim()
    return Response.json({
      text,
      ...(text
        ? {}
        : {
            warning: "Transcription returned empty text. You can edit/type a transcript and proceed.",
          }),
    })
  } catch (e: any) {
    console.error("[v0] Transcribe error:", e?.message || e)
    const msg =
      typeof e?.message === "string" && /insufficient_quota|429/i.test(e.message)
        ? "Transcription provider quota exceeded. Please use Browser Transcription or paste your transcript."
        : "Transcription is currently unavailable. Use Browser Transcription or paste your transcript."
    return Response.json({ text: "", warning: msg })
  }
}