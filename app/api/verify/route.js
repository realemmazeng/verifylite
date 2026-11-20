import { createClient } from "@supabase/supabase-js";
import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const resultSchema = {
  type: SchemaType.OBJECT,
  properties: {
    name: { type: SchemaType.STRING, nullable: true },
    school: { type: SchemaType.STRING, nullable: true },
    degree: { type: SchemaType.STRING, nullable: true },
    employer: { type: SchemaType.STRING, nullable: true },
    enrollmentDate: { type: SchemaType.STRING, nullable: true, description: "YYYY-MM-DD if known" },
    graduationDate: { type: SchemaType.STRING, nullable: true, description: "YYYY-MM-DD if known" },
    employmentStartDate: { type: SchemaType.STRING, nullable: true },
    employmentEndDate: { type: SchemaType.STRING, nullable: true },
    flags: {
      type: SchemaType.ARRAY,
      items: { type: SchemaType.STRING },
      description: "Suspicious inconsistencies, e.g. graduation before enrollment, overlapping job dates. Empty array if none.",
    },
    summary: { type: SchemaType.STRING, description: "One sentence summary of the document." },
  },
  required: ["flags", "summary"],
};

const PROMPT = `You are reviewing a resume, diploma, or employment document for a hiring verification tool.
Extract the fields defined in the schema. If a field isn't present in the document, leave it null.
Then check for inconsistencies a human reviewer would flag as suspicious, such as:
- graduation date earlier than enrollment date
- overlapping employment date ranges
- dates that are impossible (e.g. in the future, or before 1950)
List each issue found as a short string in "flags". If nothing looks wrong, return an empty array.
Write a one-sentence "summary" of who/what the document is about.`;

export async function POST(request) {
  const authHeader = request.headers.get("authorization") || "";
  const token = authHeader.replace("Bearer ", "");
  if (!token) {
    return Response.json({ error: "Missing auth token" }, { status: 401 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    { global: { headers: { Authorization: `Bearer ${token}` } } }
  );

  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) {
    return Response.json({ error: "Invalid or expired session" }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("file");
  const filePath = formData.get("filePath");
  if (!file || !filePath) {
    return Response.json({ error: "Missing file or filePath" }, { status: 400 });
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  const base64Data = bytes.toString("base64");

  let extracted;
  try {
    const model = genAI.getGenerativeModel({
      model: "gemini-3.5-flash-lite",
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: resultSchema,
      },
    });

    const result = await model.generateContent([
      { inlineData: { data: base64Data, mimeType: file.type } },
      { text: PROMPT },
    ]);

    extracted = JSON.parse(result.response.text());
  } catch (err) {
    return Response.json(
      { error: "AI extraction failed", details: err.message },
      { status: 502 }
    );
  }

  const { flags, summary, ...fields } = extracted;

  const { data: savedRow, error: insertError } = await supabase
    .from("documents")
    .insert({
      user_id: user.id,
      file_path: filePath,
      file_name: file.name,
      extracted: fields,
      flags: flags || [],
      summary: summary || "",
    })
    .select()
    .single();

  if (insertError) {
    return Response.json(
      { error: "Saved AI result but failed to write to database", details: insertError.message },
      { status: 500 }
    );
  }

  return Response.json(savedRow);
}
