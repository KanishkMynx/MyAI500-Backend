// imports
const express = require("express");
const router = express.Router();
// import controller
const userController = require("../controllers/user");

// user route handler
router.get("/", userController.getUser);
router.post("/", userController.createUser);
router.put("/:id", userController.updateUser);
router.delete("/:id", userController.deleteUser);

// export
module.exports = { userRouter: router };
