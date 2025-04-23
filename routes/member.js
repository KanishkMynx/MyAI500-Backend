const express = require("express");
const router = express.Router();
const memberController = require("../controllers/member");

router.get("/", memberController.getMembers);
router.post("/", memberController.createMember);
router.put("/:id", memberController.updateMember);
router.delete("/:id", memberController.deleteMember);

module.exports = { memberRouter: router };