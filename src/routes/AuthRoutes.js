const express = require("express");
const router = express.Router();

const { AuthControllers } = require("./../controllers");
const {
  verifyTokenAccess,
  verifyEmailforget,
} = require("./../helpers/verifyToken");
const {
  Register,
  keeplogin,
  login,
  lupapassword,
  gantipassword,
} = AuthControllers;

router.post("/register", Register);
router.post("/login", login);
router.get("/keeplogin", verifyTokenAccess, keeplogin);
router.post("/forget", lupapassword);
router.put("/ganti", verifyEmailforget, gantipassword);

module.exports = router;
