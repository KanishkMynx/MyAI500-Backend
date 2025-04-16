// imports
const express = require("express");
const router = express.Router();

// import controller
const callController = require("../controllers/calls");

// call incoming and connection routes
router.post("/incoming", callController.incomingCall);
router.post("/connection", callController.callConnection);

// export router
module.exports = { defaultRouter: router };
