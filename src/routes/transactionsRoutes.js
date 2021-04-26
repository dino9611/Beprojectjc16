const express = require("express");
const router = express.Router();

const { transactionControllers } = require("./../controllers");
const { verifyTokenAccess, checkid } = require("./../helpers/verifyToken");
const {
  AddToCart,
  DeleteCart,
  updateQty,
  checkOut,
  getHistory,
} = transactionControllers;

router.post("/cart", verifyTokenAccess, checkid, AddToCart);
router.delete("/deletecart/:id/:idusers", verifyTokenAccess, DeleteCart);
router.patch("/cart/qty/:id", verifyTokenAccess, checkid, updateQty);
router.put("/checkout", verifyTokenAccess, checkid, checkOut);
router.get("/history/:idusers", getHistory);

module.exports = router;
