const express = require("express");
const router = express.Router();

const { AuthControllers } = require("./../controllers");
const {
  verifyTokenAccess,
  verifyEmailforget,
} = require("./../helpers/verifyToken");
const { changeUser } = require("../connection/mysqldb");

const {
  Register,
  keeplogin,
  login,
  lupapassword,
  gantipassword,
  TambahAlamat,
  ChangeToAdmin,
} = AuthControllers;

router.post("/register", Register);
router.post("/login", login);
router.get("/keeplogin", verifyTokenAccess, keeplogin);
router.post("/forget", lupapassword);
router.put("/ganti", verifyEmailforget, gantipassword);
router.post("/alamat/post/:idusers", verifyTokenAccess, TambahAlamat);
router.patch("/users/admin/:idusers", verifyTokenAccess, ChangeToAdmin);

module.exports = router;
