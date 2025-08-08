import { google } from "googleapis";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).send("Method Not Allowed");

  const { email, rowIndex } = req.body;
  const sheetName = `${email}_Debts`;

  const auth = new google.auth.GoogleAuth({
    credentials: JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT),
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });

  const client = await auth.getClient();
  const sheets = google.sheets({ version: "v4", auth: client });

  try {
    await sheets.spreadsheets.values.update({
      spreadsheetId: process.env.SHEET_ID,
      range: `${sheetName}!E${rowIndex + 2}`,
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: [["Paid"]],
      },
    });
    res.status(200).json({ message: "Debt marked as paid" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
