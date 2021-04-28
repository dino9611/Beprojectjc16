const express = require("express");
const router = express.Router();

const { productsControllers } = require("./../controllers");
const { verifyTokenAccess } = require("./../helpers/verifyToken");
const { post } = require("./AuthRoutes");
const { patch } = require("./transactionsRoutes");
const {
  getProductsAdmin,
  getProductsCategory,
  postProducts,
  deleteProducts,
  getProductsbyid,
  latihan,
  PostRating,
} = productsControllers;

router.get("/admin", getProductsAdmin);
router.get("/", getProductsAdmin);
router.get("/:id", getProductsbyid);
router.get("/category", getProductsCategory);
router.post("/admin", postProducts);
router.delete("/admin/:id", deleteProducts);
router.post("/rating/add", verifyTokenAccess, PostRating);
// router.get("/get", latihan);

module.exports = router;

// method :post
// pake token
// endpoint : /product/rating/add
// requestBody :{
//   rating:1-5 range ,
//   users_id:,
//   products_id:
// }

// response{
//  id:id yang baru dibuat
//   message : 'success add rating'
// }

// method:patch,
// pake token
// endpoint : /auth/users/admin/:idusers
// response{
//   message : 'update success'
// }

// method:get
// endpoint:/trans/orders misalkan ditambah ?sort=desc
// hasil yang diinginkan urutkan oncart,onwaitingpayment,cancelled
// response :[
//   {
//     idorders:,
//     status :,
//     username:,
//     bank:,
//     expired:,
//   }
//   ...
// ]
