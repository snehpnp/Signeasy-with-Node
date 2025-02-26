const express = require("express")
const app = express()

const path = require("path")
const fs = require("fs")

const dotenv = require("dotenv")
dotenv.config({path:path.join(__dirname,"config.env")})

const bodyParser = require("body-parser")
app.use(bodyParser.json())

const mongoose = require("mongoose")

let db = process.env.DATABASE 

mongoose
  .connect(db, {
  })
  .then(() => {
    console.log("Database Connected");
  });


app.use(require("./routes/doc"))

// const data = fs.readFileSync(`${__dirname}/controllers/file.txt`,'latin1')
//     console.log(data);

const PORT = process.env.PORT || 8000
app.listen(PORT,()=>{
    console.log("listening at "+PORT)
})
