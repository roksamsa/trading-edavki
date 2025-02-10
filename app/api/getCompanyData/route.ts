import path from "path";
import { promises as fs } from "fs";

export default async function handler(req, res) {
  const { companyName } = req.query; // Get the companyName from the route

  try {
    // Define the path to the JSON file
    const filePath = path.join(process.cwd(), "public", "companies.json");

    // Read and parse the JSON file
    const fileContents = await fs.readFile(filePath, "utf8");
    const companies = JSON.parse(fileContents);

    // Find the company by name (case-insensitive)
    const company = companies.find((c) =>
      c.Name.toLowerCase().includes(companyName.toLowerCase()),
    );

    if (company) {
      res.status(200).json(company); // Return the matching company
    } else {
      res.status(404).json({ error: `Company "${companyName}" not found.` });
    }
  } catch (error) {
    console.error("Error reading or parsing the JSON file:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
}
