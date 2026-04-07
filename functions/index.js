const { onRequest } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");
const { google } = require("googleapis");

// Define secrets
const DRIVE_CLIENT_EMAIL = defineSecret("DRIVE_CLIENT_EMAIL");
const DRIVE_PRIVATE_KEY = defineSecret("DRIVE_PRIVATE_KEY");

exports.uploadToDrive = onRequest(
  {
    secrets: [DRIVE_CLIENT_EMAIL, DRIVE_PRIVATE_KEY],
  },
  async (req, res) => {
    try {
      // Fix private key formatting
      const privateKey = DRIVE_PRIVATE_KEY.value().replace(/\\n/g, "\n");

      const auth = new google.auth.JWT(
        DRIVE_CLIENT_EMAIL.value(),
        null,
        privateKey,
        ["https://www.googleapis.com/auth/drive"]
      );

      const drive = google.drive({
        version: "v3",
        auth: auth,
      });

      const fileMetadata = {
        name: req.body.fileName,
        parents: ["1POMGnIc_QRJbEeOiWbPwiV2YidsBa9YA"], // Your Drive folder ID
      };

      const media = {
        mimeType: req.body.mimeType,
        body: Buffer.from(req.body.fileData, "base64"),
      };

      const response = await drive.files.create({
        resource: fileMetadata,
        media: media,
        fields: "id",
      });

      res.status(200).json({
        success: true,
        fileId: response.data.id,
      });

    } catch (error) {
      console.error("Upload Error:", error);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }
);
