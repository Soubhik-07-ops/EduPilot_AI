import { type Database, supabase } from "@/lib/supabaseClient";

type SubmissionRow = Database["public"]["Tables"]["submissions"]["Row"];
type SubmissionInsert = Database["public"]["Tables"]["submissions"]["Insert"];
type ResultRow = Database["public"]["Tables"]["results"]["Row"];
type ResultInsert = Database["public"]["Tables"]["results"]["Insert"];

export async function createSubmission(
  payload: Omit<SubmissionInsert, "id" | "submitted_at">,
): Promise<SubmissionRow> {
  const { data, error } = await supabase
    .from("submissions")
    .insert(payload as SubmissionInsert)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create submission: ${error.message}`);
  }

  return data;
}

export async function fetchSubmissions(): Promise<SubmissionRow[]> {
  const { data, error } = await supabase
    .from("submissions")
    .select("*")
    .order("submitted_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch submissions: ${error.message}`);
  }

  return data;
}

export async function saveResult(payload: Omit<ResultInsert, "id" | "created_at">): Promise<ResultRow> {
  const { data, error } = await supabase
    .from("results")
    .insert(payload as ResultInsert)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to save result: ${error.message}`);
  }

  return data;
}

export async function fetchResults(submissionId?: string): Promise<ResultRow[]> {
  let query = supabase.from("results").select("*").order("created_at", { ascending: false });

  if (submissionId) {
    query = query.eq("submission_id", submissionId);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to fetch results: ${error.message}`);
  }

  return data;
}

export async function uploadFileToSupabaseStorage(file: File): Promise<string> {
  if (!file || !file.name) {
    throw new Error("Invalid file provided for upload.");
  }

  const safeFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const uniqueFileName = `${Date.now()}-${crypto.randomUUID()}-${safeFileName}`;
  const filePath = `uploads/${uniqueFileName}`;

  const { error: uploadError } = await supabase.storage
    .from("submissions")
    .upload(filePath, file, {
      cacheControl: "3600",
      upsert: false,
      contentType: file.type || undefined,
    });

  if (uploadError) {
    throw new Error(`Failed to upload file: ${uploadError.message}`);
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from("submissions").getPublicUrl(filePath);

  if (!publicUrl) {
    throw new Error("Failed to generate public URL for uploaded file.");
  }

  return publicUrl;
}

export type { ResultInsert, ResultRow, SubmissionInsert, SubmissionRow };
