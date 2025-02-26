const router = require("express").Router();
const {uploadOriginal, addDoc, sendEnvelope, getSignedId, downloadEnvelopeAndCertificate} = require("../controllers/doc")
const multer = require("multer")
const upload = multer({dest:__dirname +"../../uploads"});

router.post("/upload",upload.single("file"),uploadOriginal)
router.post("/add-doc",addDoc)
router.post("/send-envelope",sendEnvelope)
router.post("/get-signed-id",getSignedId)
router.post("/download",downloadEnvelopeAndCertificate)

module.exports = router