const express = require("express");
const router = express.Router();

const { AuthControllers } = require("./../controllers");
const { verifyTokenAccess } = require("./../helpers/verifyToken");
const { Register, keeplogin, login } = AuthControllers;

router.post("/register", Register);
router.post("/login", login);
router.get("/keeplogin", verifyTokenAccess, keeplogin);

module.exports = router;
