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
  getbanksandAlamat,
  bayar,
  batal,
  getOrders,
  getWaitingVerification,
} = transactionControllers;

router.post("/cart", verifyTokenAccess, checkid, AddToCart);
router.delete("/deletecart/:id/:idusers", verifyTokenAccess, DeleteCart);
router.patch("/cart/qty/:id", verifyTokenAccess, checkid, updateQty);
router.put("/checkout", verifyTokenAccess, checkid, checkOut);
router.get("/history/:idusers", getHistory);
router.get("/banksAlamat/:idusers", getbanksandAlamat);
router.post("/bayar/:idorders", verifyTokenAccess, bayar);
router.delete("/batal", verifyTokenAccess, batal);
router.get("/orders", getOrders);
router.get("/verif", getWaitingVerification);
module.exports = router;

// `select * from product p join category on p.ca where `
// if(minprice)
// sql+='price >=200'
// if(tahun){

// }
// ("method get");
// ("http//:localhost:5000/products/get?minprice=200&tahun=2012&categoryid=3");{minprice:200,tahun:2012,categoryid:3}
// ("http//:localhost:5000/products/get?minprice=200"); {minprice:200}
// ("http//:localhost:5000/products/get?tahun=200&categoryid=1"); {minprice:200,categoryid:1}
// response
// [
// {
//   idproducts:1,
//   name:'',
//   price:'',
//   description:'',
//   image:
//   tahun:
//   category:mobil,
// }
// ...
// ]
//fitur untuk tambha alamat
// method post
// pake token
// body
// {
//   alamat:'dasdasd',
// users_id: idusers;
// }
// ("http//:localhost:5000/alamat/post/:idusers")

// {
//   message : 'creted'
// }
