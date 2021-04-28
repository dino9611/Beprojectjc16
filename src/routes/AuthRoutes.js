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
  TambahAlamat,
} = AuthControllers;

router.post("/register", Register);
router.post("/login", login);
router.get("/keeplogin", verifyTokenAccess, keeplogin);
router.post("/forget", lupapassword);
router.put("/ganti", verifyEmailforget, gantipassword);
router.post("/alamat/post/:idusers", verifyTokenAccess, TambahAlamat);

module.exports = router;
