import { NextResponse } from "next/server"

export async function GET() {
  const groqKey = process.env.GROQ_API_KEY
  const assemblyKey = process.env.ASSEMBLYAI_API_KEY
  
  return NextResponse.json({
    groqKey: groqKey ? `${groqKey.substring(0, 10)}...${groqKey.substring(groqKey.length - 4)}` : "NOT SET",
    assemblyKey: assemblyKey ? `${assemblyKey.substring(0, 10)}...${assemblyKey.substring(assemblyKey.length - 4)}` : "NOT SET",
    groqExists: !!groqKey,
    assemblyExists: !!assemblyKey,
    allConfigured: !!groqKey && !!assemblyKey
  })
}
