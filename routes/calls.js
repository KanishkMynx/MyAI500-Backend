// imports
const express = require("express");
const router = express.Router();
const expressWs = require('express-ws');

// import controller
const callController = require("../controllers/calls");


expressWs(router);

// user route handler
router.get("/", callController.getCall);
router.post("/", callController.createCall);
router.put("/:id", callController.updateCall);
router.delete("/:id", callController.deleteCall);

// call incoming and connection routes
router.post("/incoming", callController.incomingCall);
router.ws("/connection", callController.callConnection);

// export router
module.exports = { callRouter: router };
