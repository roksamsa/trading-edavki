import path from "path";
import { promises as fs } from "fs";

export async function GET(request) {
  // Extract the `companyName` query parameter from the URL
  const { searchParams } = new URL(request.url);
  const companyName = searchParams.get("companyName");

  if (!companyName) {
    return new Response(
      JSON.stringify({ error: "companyName query parameter is required." }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  try {
    // Define the path to the JSON file
    const filePath = path.join(process.cwd(), "public", "companies.json");

    // Read and parse the JSON file
    const fileContents = await fs.readFile(filePath, "utf8");
    const companies = JSON.parse(fileContents);

    // Find the company by name (case-insensitive)
    const company = companies.find((company) =>
      company.Name.toLowerCase().includes(companyName.toLowerCase()),
    );

    if (company) {
      return new Response(JSON.stringify(company), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } else {
      return new Response(
        JSON.stringify({ error: `Company "${companyName}" not found.` }),
        { status: 404, headers: { "Content-Type": "application/json" } },
      );
    }
  } catch (error) {
    console.error("Error reading or parsing the JSON file:", error);
    return new Response(JSON.stringify({ error: "Internal Server Error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
