// const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
// const {
//   DynamoDBDocumentClient,
//   GetCommand,
//   PutCommand,
// } = require("@aws-sdk/lib-dynamodb");
import { eventHandler } from './methods/EventHandler';
const express = require("express");
const serverless = require("serverless-http");


const app = express();


app.use(express.json());

app.get("/insertliquidity/:eventName/:tokenId/:blockNumber/:amount0/:amount1/:hash", async function (req, res) {
  const { eventName, tokenId, blockNumber, amount0, amount1, hash } = req.body
  await eventHandler(
    eventName,
    tokenId,
    blockNumber,
    amount0,
    amount1,
    hash
  )
});

module.exports.handler = serverless(app);
