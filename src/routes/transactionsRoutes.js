const express = require("express");
const router = express.Router();

const { transactionControllers } = require("./../controllers");
const { verifyTokenAccess, checkid } = require("./../helpers/verifyToken");
const { AddToCart } = transactionControllers;

router.post("/cart", verifyTokenAccess, checkid, AddToCart);

// router.post("/login", login);
// router.get("/keeplogin", verifyTokenAccess, keeplogin);

module.exports = router;
