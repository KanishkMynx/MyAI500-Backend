// imports
const express = require("express");
const router = express.Router();

// import controller
const callController = require("../controllers/calls");

// user route handler
router.get("/", callController.getCall);
router.post("/", callController.createCall);
router.put("/:id", callController.updateCall);
router.delete("/:id", callController.deleteCall);

// call incoming and connection routes
router.post("/incoming", callController.incomingCall);
router.post("/connection", callController.callConnection);

// export router
module.exports = { callRouter: router };
