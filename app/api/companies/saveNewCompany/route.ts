import path from "path";
import { promises as fs } from "fs";

const filePath = path.join(process.cwd(), "public", "companies.json");

export async function POST(request) {
  try {
    // Get the new company data from the request body
    const body = await request.json();
    const { Symbol, Name, Address, ISIN } = body;

    if (!Symbol || !Name || !Address || !ISIN) {
      return new Response(
        JSON.stringify({ error: "Missing required fields." }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    // Read the current JSON file
    const fileContents = await fs.readFile(filePath, "utf8");
    const companies = JSON.parse(fileContents);

    // Add the new company to the array
    const newCompany = {
      Symbol,
      Name,
      Address,
      ISIN,
    };

    companies.push(newCompany);

    // Write the updated data back to the file
    await fs.writeFile(filePath, JSON.stringify(companies, null, 2), "utf8");

    return new Response(JSON.stringify(newCompany), {
      status: 201,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error writing to JSON file:", error);

    return new Response(JSON.stringify({ error: "Failed to add company." }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
