import path from "path";
import { promises as fs } from "fs";

export async function GET(request) {
  try {
    const filePath = path.join(process.cwd(), "public", "companies.json");
    const fileContents = await fs.readFile(filePath, "utf8");
    const companies = JSON.parse(fileContents);

    return new Response(JSON.stringify(companies), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error(error);
    return new Response(JSON.stringify({ error: "Internal Server Error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
