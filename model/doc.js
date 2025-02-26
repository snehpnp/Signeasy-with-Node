const mongoose = require("mongoose")
const Schema = mongoose.Schema

const doc = new Schema({
   billingId : Number,
   amount: Number,
   originalId:String,
   pendingId:String,
   signedId:String,
   x:Number,
   y:Number
})

module.exports = mongoose.model("doc",doc)