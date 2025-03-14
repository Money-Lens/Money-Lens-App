require("dotenv").config({ path: '.env' });
const express = require("express");
const bodyParser = require("body-parser");
const { syncTransactions} = require("./routes/plaidRoutes");

const WEBHOOK_PORT = process.env.WEBHOOK_PORT || 8001;


const webhookApp = express();
webhookApp.use(bodyParser.urlencoded({ extended: false }));
webhookApp.use(bodyParser.json());

const webhookServer = webhookApp.listen(WEBHOOK_PORT, function () {
    console.log(
      `Webhook receiver is up and running at http://localhost:${WEBHOOK_PORT}/`
    );
  });

webhookApp.post("/server/receive_webhook", async (req, res, next) => {
    try {
      console.log("**INCOMING WEBHOOK**");
      console.dir(req.body, { colors: true, depth: null });
      const product = req.body.webhook_type;
      const code = req.body.webhook_code;
  
      switch (product) {
        case "TRANSACTIONS":
          handleTxnWebhook(code, req);
          break;
        default:
          console.log(`Can't handle webhook product ${product}`);
          break;
      }
      res.json({ status: "received" });
    } catch (error) {
      next(error);
    }
  });
  
  function handleTxnWebhook(code, req) {
    switch (code) {
      case "SYNC_UPDATES_AVAILABLE":
        console.log("Webhook Sync updates are available");
        const client = req.app.locals.plaidClient;
        syncTransactions(client, req.body.item_id);
        break;
      default:
        console.log(`Can't handle webhook code ${code}`);
        break;
    }
  }

const getWebhookServer = function() {

    return webhookServer;
  };
  
module.exports = {
    getWebhookServer,
  };
  