const express = require("express");
const router = express.Router();

const { AuthControllers } = require("./../controllers");
const { verifyTokenAccess } = require("./../helpers/verifyToken");
const { Register, keeplogin } = AuthControllers;

router.post("/register", Register);
router.get("/keeplogin", verifyTokenAccess, keeplogin);

module.exports = router;
