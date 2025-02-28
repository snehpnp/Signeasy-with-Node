const docSchema = require("../model/doc");
const request = require("request");
const fs = require("fs");
const { ObjectID } = require("bson");

module.exports.uploadOriginal = async (req, res) => {
  let options = {
    method: "POST",
    url: "https://api.signeasy.com/v3/original/",
    headers: {
      Authorization: "Bearer " + process.env.SIGNEASY_ACCESS_TOKEN,
    },
    formData: {
      file: {
        value: fs.createReadStream(req.file.path),
        options: {
          filename: "",
          contentType: null,
        },
      },
      name: req.file.originalname,
      rename_if_exists: "1",
    },
  };
  request(options, async function (error, response) {
    if (error) res.json({ error: error });

    let resp = JSON.parse(response.body);
    await docSchema.findByIdAndUpdate(ObjectID(req.body.id), {
      $set: {
        originalId: resp.id,
        x: Number(req.body.x),
        y: Number(req.body.y),
      },
    });
    fs.unlink(req.file.path, (err) => {
      if (err) console.log(err);
      else {
        console.log("Deleted file after uploading");
      }
    });
    return res.status(200).json({
      success: true,
      message: "file uploaded successfully " + resp,
    });
  });
};
module.exports.addDoc = async (req, res) => {
  try {
    const doc = new docSchema({
      billingId: req.body.id,
      amount: req.body.amount,
    });

    await doc.save();
    return res.status(200).json({
      success: true,
      message: "doc added successfully",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error,
    });
  }
};



module.exports.sendEnvelope = async (req, res) => {
  try {
    const doc = await docSchema.findById(req.body.doc_id);

    const fields_payload = [
      {
        recipient_id: 1,
        source_id: 1,
        type: "signature",
        required: true,
        page_number: "all",
        position: {
          xOffset: 0,
          yOffset: -20,
          height: 30,
          width: 100,

          mode: "referenceText",
          reference_text: "{{SIGN}}",
          text: "{{SIGN}}",
        },
        additional_info: {},
      },
    ];


    let options = {
      method: "POST",
      url: "https://api.signeasy.com/v3/rs/envelope/",
      headers: {
        Authorization: "Bearer " + process.env.SIGNEASY_ACCESS_TOKEN,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        embedded_signing: true,
        is_ordered: false,
        message: "This is for you to confirm your payment",
        sources: [
          {
            id: Number(doc.originalId),
            type: "original",
            name: "CONFIDENTIAL",
            source_id: 1,
          },
        ],
        recipients: [
          {
            first_name: req.body.first_name,
            last_name: req.body.last_name,
            email: req.body.email,
            recipient_id: 1,
          },
        ],
        signature_panel_types: ["draw", "type"],
        initial_panel_types: ["draw"],
        fields_payload, // Insert the dynamic signature positions
      }),
    };

    request(options, function (error, response) {
      if (error) return res.json({ error });

      let resp = JSON.parse(response.body);
      console.log(resp, resp.id);

      let options = {
        method: "POST",
        url: `https://api.signeasy.com/v3/rs/envelope/${resp.id}/signing/url/`,
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + process.env.SIGNEASY_ACCESS_TOKEN,
        },
        body: JSON.stringify({
          recipient_email: req.body.email,
        }),
      };

      request(options, async function (error, response) {
        if (error) return res.json({ error });
        let resp2 = JSON.parse(response.body);
        resp2.pending_id = resp.id;
        doc.pendingId = resp.id;
        await doc.save();
        res.send(resp2);
      });
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
};

module.exports.getSignedId = async (req, res) => {
  let options = {
    method: "GET",
    url: `https://api.signeasy.com/v3/rs/envelope/signed/pending/${req.body.pending_id}`,
    headers: {
      Authorization: "Bearer " + process.env.SIGNEASY_ACCESS_TOKEN,
    },
  };
  request(options, async function (error, response) {
    if (error) res.json({ error: error });
    // res.send(response.body);
    let resp = JSON.parse(response.body);
    if (resp.id) {
      const doc = await docSchema.findById(ObjectID(req.body.doc_id));
      doc.signedId = resp.id;
      await doc.save();
      return res.status(200).json({
        success: true,
        message: "signed ID added successfully, signed ID is " + resp.id,
      });
    }
    res.send(resp);
  });
};

const axios = require("axios");
const path = require("path");

module.exports.downloadEnvelopeAndCertificate = async (req, res) => {
  try {
    const signedId = req.body.signed_id;
    const url = `https://api.signeasy.com/v3/rs/envelope/signed/${signedId}/certificate`;

    const response = await axios.get(url, {
      headers: { Authorization: `Bearer ${process.env.SIGNEASY_ACCESS_TOKEN}` },
      responseType: "stream", // Important for file download
    });

    const filePath = path.join(__dirname, "certificate.pdf");
    const writer = fs.createWriteStream(filePath);

    response.data.pipe(writer);

    writer.on("finish", () => {
      console.log("Download Completed");
      res.download(filePath); // Send file to user for download
    });

    writer.on("error", (error) => {
      console.error("File Write Error:", error);
      res.status(500).json({ error: "File download failed" });
    });

  } catch (error) {
    console.error("Download Error:", error);
    res.status(500).json({ error: "Failed to download PDF" });
  }
};

// module.exports.sendEnvelope = async(req,res)=>{

//   const doc = await docSchema.findById(ObjectID(req.body.doc_id))

//   let options = {
//     'method': 'POST',
//     'url': 'https://api.signeasy.com/v3/rs/envelope/',
//     'headers': {
//       'Authorization': 'Bearer '+process.env.SIGNEASY_ACCESS_TOKEN,
//       'Content-Type': 'application/json'
//     },
//     body:JSON.stringify(
//       {
//         "embedded_signing": true,
//         "is_ordered": false,
//         "message": "This is for you to confirm your payment",
//         "sources": [
//          {
//           "id": Number(doc.originalId),
//           "type": "original",
//           "name": "CONFIDENTIAL",
//           "source_id": 1
//          }
//         ],
//         "recipients": [
//          {
//           "first_name": req.body.first_name,
//           "last_name": req.body.last_name,
//           "email": req.body.email,
//           "recipient_id": 1
//          }
//         ],

//         "signature_panel_types": [
//          "draw",
//          "type"
//         ],
//         "initial_panel_types": [
//          "draw"
//         ],
//         "fields_payload": [
//          {
//           "recipient_id": 1,
//           "source_id": 1,
//           "type": "signature",
//           "required": true,
//           "page_number": "all",
//           "position": {
//            "height": 100,
//            "width": 100,
//            "x": doc.x,
//            "y": doc.y,
//            "mode": "fixed"
//           },
//           "additional_info": {}
//          }
//         ]
//        }
//     )
//   }
//   request(options, function (error, response) {
//     if (error) res.json({error:error});
//     // res.send(response.body);
//     //fetch-link
//     let resp = JSON.parse(response.body)
//     console.log(resp,resp.id);

//     let options = {
//       'method': 'POST',
//       'url': `https://api.signeasy.com/v3/rs/envelope/${resp.id}/signing/url/`,
//       'headers': {
//         'Content-Type': 'application/json',
//         'Authorization': 'Bearer '+process.env.SIGNEASY_ACCESS_TOKEN,

//       },
//       body: JSON.stringify({
//         "recipient_email":req.body.email,
//       })

//     };
//     request(options, async function (error, response) {
//       if (error) res.json({error:error});
//       let resp2 = JSON.parse(response.body)
//       resp2.pending_id = resp.id
//       doc.pendingId = resp.id
//       await doc.save()
//       res.send(resp2);
//     });

//   });
// }
