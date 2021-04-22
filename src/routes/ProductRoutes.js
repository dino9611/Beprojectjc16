const express = require("express");
const router = express.Router();

const { productsControllers } = require("./../controllers");
const { verifyTokenAccess } = require("./../helpers/verifyToken");
const {
  getProductsAdmin,
  getProductsCategory,
  postProducts,
  deleteProducts,
} = productsControllers;

router.get("/admin", getProductsAdmin);
router.get("/category", getProductsCategory);
router.post("/admin", postProducts);
router.delete("/admin/:id", deleteProducts);
// router.post("/login", login);
// router.get("/keeplogin", verifyTokenAccess, keeplogin);

module.exports = router;
