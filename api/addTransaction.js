import { google } from "googleapis";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).send("Method Not Allowed");

  const auth = new google.auth.GoogleAuth({
    credentials: JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT),
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });

  const client = await auth.getClient();
  const sheets = google.sheets({ version: "v4", auth: client });

  const { email, date, type, amount, category, note } = req.body;
  const sheetName = `${email}_Transactions`;

  try {
    // Ensure sheet/tab exists
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: process.env.SHEET_ID,
      requestBody: {
        requests: [
          {
            addSheet: {
              properties: {
                title: sheetName,
              },
            },
          },
        ],
      },
    });
  } catch (e) {
    // Ignore error if sheet already exists
    if (!e.message.includes("already exists")) console.log("Sheet check:", e.message);
  }

  // Append transaction row
  try {
    await sheets.spreadsheets.values.append({
      spreadsheetId: process.env.SHEET_ID,
      range: `${sheetName}!A1`,
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: [[date, type, amount, category, note]],
      },
    });

    res.status(200).json({ message: "Transaction added!" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
