const express = require("express");
const router = express.Router();
const agentController = require("../controllers/agent");

router.get("/", agentController.getAgent);
router.post("/", agentController.createAgent);
router.put("/:id", agentController.updateAgent);
router.delete("/:id", agentController.deleteAgent);

module.exports = { agentRouter: router };