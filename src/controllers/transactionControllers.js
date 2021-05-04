const { mysqldb } = require("./../connection");
const { promisify } = require("util");
const dba = promisify(mysqldb.query).bind(mysqldb);
const dbtransaction = promisify(mysqldb.beginTransaction).bind(mysqldb);
const dbrollback = promisify(mysqldb.rollback).bind(mysqldb);
const dbcommit = promisify(mysqldb.commit).bind(mysqldb);
const { uploader } = require("./../lib");
const fs = require("fs");
Date.prototype.addDays = function (days) {
  var date = new Date(this.valueOf());
  date.setDate(date.getDate() + days);
  return date;
};

module.exports = {
  AddToCart: (req, res) => {
    const { idusers, idprod, qty } = req.body;
    if (!idusers || !idprod || !qty) {
      return res.status(400).send({ message: "bad request" });
    }
    let sql = `select * from orders where status = 'onCart' and users_id = ?;`;
    mysqldb.query(sql, [idusers], (err, cart) => {
      if (err) {
        console.log(err);
        return res.status(500).send({ message: "server error" });
      }
      if (cart.length) {
        sql = `select * from ordersdetail where products_id = ? and orders_id = ? and isdeleted=0;`;
        let order_id = cart[0].idorders;
        mysqldb.query(sql, [idprod, order_id], (err, isicart) => {
          if (err) {
            console.log(err);
            return res.status(500).send({ message: "server error" });
          }
          // jika barangnya sudah ada maka update qty
          if (isicart.length) {
            //   kita check apakah penambahan kuantity akan melebihi qty di inventory
            sql = `select sum(qty) as total from inventory where products_id = ?;`;
            mysqldb.query(sql, [idprod], (err, result1) => {
              if (err) {
                console.log(err);
                return res.status(500).send({ message: "server error" });
              }
              // jika qty + qty yang sudah ada > qty inventory
              // maka gagalkan
              let qtytotal = isicart[0].qty + parseInt(qty);
              if (qtytotal > result1[0].total) {
                return res.status(500).send({ message: "qty kelebihan" });
              }
              // ubah qty saja
              sql = `update ordersdetail set ? where id = ?`;
              let detailUpdate = {
                qty: qtytotal,
              };
              mysqldb.query(sql, [detailUpdate, isicart[0].id], (err) => {
                if (err) {
                  console.log(err);
                  return res.status(500).send({ message: "server error" });
                }
                //get cart
                sql = `select id,p.* ,sum(i.qty) as stock ,od.qty
                from products p 
                join inventory i on p.idproducts = i.products_id
                join ordersdetail od on p.idproducts = od.products_id 
                where isdeleted= 0 and od.orders_id = 
                                (select idorders from orders 
                                where status = 'onCart' 
                                and users_id = ?)
                group by i.products_id`;
                mysqldb.query(sql, [idusers], (err, cart) => {
                  if (err) {
                    return res.status(500).send({ message: "server error" });
                  }
                  return res.status(200).send(cart);
                });
              });
            });
          } else {
            sql = `insert into ordersdetail set ?`;
            let detailInsert = {
              qty: qty,
              orders_id: order_id,
              products_id: idprod,
            };
            mysqldb.query(sql, detailInsert, (err) => {
              if (err) {
                console.log(err);
                return res.status(500).send({ message: "server error" });
              }
              //get cart
              sql = `select id,p.* ,sum(i.qty) as stock ,od.qty
              from products p 
              join inventory i on p.idproducts = i.products_id
              join ordersdetail od on p.idproducts = od.products_id 
              where isdeleted= 0 and od.orders_id = 
                              (select idorders from orders 
                              where status = 'onCart' 
                              and users_id = ?)
              group by i.products_id`;
              mysqldb.query(sql, [idusers], (err, cart) => {
                if (err) {
                  return res.status(500).send({ message: "server error" });
                }
                return res.status(200).send(cart);
              });
            });
          }
        });
      } else {
        // karena 2 langkah atau lebih pada manipulasi data
        // maka dianjurkan menggunakan transaction
        // gunanya transaction adalah jika salah satu langkah gagal
        // maka semua akna dikembalikan seperti semula
        mysqldb.beginTransaction((err) => {
          if (err) {
            console.log(err);
            return res.status(500).send({ message: "server error" });
          }
          sql = `insert into orders set ?`;
          let dataInsert = {
            status: "onCart",
            users_id: idusers,
          };
          mysqldb.query(sql, dataInsert, (err, result) => {
            if (err) {
              console.log(err);
              return mysqldb.rollback(() => {
                return res.status(500).send({ message: "server error" });
              });
            }
            sql = `insert into ordersdetail set ?`;
            let detailInsert = {
              qty: qty,
              orders_id: result.insertId,
              products_id: idprod,
            };
            mysqldb.query(sql, detailInsert, (err) => {
              if (err) {
                console.log(err);
                return mysqldb.rollback(() => {
                  return res.status(500).send({ message: "server error" });
                });
              }
              mysqldb.commit((err) => {
                if (err) {
                  console.log(err);
                  return mysqldb.rollback(function () {
                    return res.status(500).send({ message: "server error" });
                  });
                }
                //get cart
                sql = `select id,p.* ,sum(i.qty) as stock ,od.qty
                from products p 
                join inventory i on p.idproducts = i.products_id
                join ordersdetail od on p.idproducts = od.products_id 
                where isdeleted= 0 and orders_id = 
                                (select idorders from orders 
                                where status = 'onCart' 
                                and users_id = ?)
                group by i.products_id`;
                mysqldb.query(sql, [idusers], (err, cart) => {
                  if (err) {
                    return res.status(500).send({ message: "server error" });
                  }
                  return res.status(200).send(cart);
                });
              });
            });
          });
        });
      }
    });
  },
  DeleteCart: async (req, res) => {
    try {
      const { id, idusers } = req.params;
      let sql = `update ordersdetail set ? where id = ?`;
      let dataupdate = {
        isdeleted: true,
      };
      await dba(sql, [dataupdate, id]);
      //get cart
      sql = `select id,p.* ,sum(i.qty) as stock ,od.qty
       from products p 
       join inventory i on p.idproducts = i.products_id
       join ordersdetail od on p.idproducts = od.products_id 
       where isdeleted= 0 and od.orders_id = 
                       (select idorders from orders 
                       where status = 'onCart' 
                       and users_id = ?)
       group by i.products_id`;
      let cart = await dba(sql, [idusers]);
      return res.status(200).send(cart);
    } catch (error) {
      console.error(error);
      return res.status(500).send({ message: "server error" });
    }
  },
  updateQty: async (req, res) => {
    try {
      const { idusers, qty } = req.body;
      const { id } = req.params;
      let sql = `update ordersdetail set ? where id = ?`;
      let dataupdate = {
        qty: qty,
      };
      await dba(sql, [dataupdate, id]);
      //get cart
      sql = `select id,p.* ,sum(i.qty) as stock ,od.qty
       from products p 
       join inventory i on p.idproducts = i.products_id
       join ordersdetail od on p.idproducts = od.products_id 
       where isdeleted= 0 and od.orders_id = 
                       (select idorders from orders 
                       where status = 'onCart' 
                       and users_id = ?)
       group by i.products_id`;
      let cart = await dba(sql, [idusers]);
      return res.status(200).send(cart);
    } catch (error) {
      console.error(error);
      return res.status(500).send({ message: "server error" });
    }
  },
  checkOut: async (req, res) => {
    try {
      const { idusers } = req.body;
      // get idorders
      let sql = `select idorders from orders 
      where status = 'onCart' and users_id = ?`;
      let orders = await dba(sql, [idusers]);
      console.log(orders);
      let idorders = orders[0].idorders;
      // get ordersdetail base on orders_id
      sql = `select od.id,p.price,od.qty,od.products_id from ordersdetail od
      join products p on od.products_id = p.idproducts
      where isdeleted=0 and orders_id = ?`;
      let ordersdetail = await dba(sql, [idorders]);
      await dbtransaction();
      var date = new Date();
      // update orders status and expired
      sql = `update orders set ? where idorders = ?`;
      let ordersuptd = {
        status: "waiting Payment",
        expired: date.addDays(2),
      };
      await dba(sql, [ordersuptd, idorders]);
      console.log(ordersdetail);
      // update price in ordersdetail
      sql = `update ordersdetail set ? where id = ?`;
      let arr = [];
      ordersdetail.forEach((val) => {
        let dataupdate = {
          price: val.price,
        };
        arr.push(dba(sql, [dataupdate, val.id]));
      });

      let insertManyInvent = ordersdetail.map((val) => [
        -1 * val.qty,
        val.products_id,
        idorders,
      ]); // ini jadi array 2 dimensi exp: [[]]
      sql = "INSERT INTO inventory (qty, products_id,orders_id) VALUES ?";
      await dba(sql, [insertManyInvent]);
      await Promise.all(arr);
      await dbcommit();
      sql = `select id,p.* ,sum(i.qty) as stock ,od.qty
            from products p 
            join inventory i on p.idproducts = i.products_id
            join ordersdetail od on p.idproducts = od.products_id 
            where isdeleted= 0 and od.orders_id = 
                            (select idorders from orders 
                            where status = 'onCart' 
                            and users_id = ?)
            group by i.products_id`;
      let cart = await dba(sql, [idusers]);
      return res.status(200).send(cart);
    } catch (error) {
      await dbrollback();
      console.error(error);
      return res.status(500).send({ message: "server error" });
    }
  },
  getHistory: async (req, res) => {
    let { idusers } = req.params;
    try {
      let sql = `select * from orders  where status in ('waiting payment','waitingVerification') and users_id = ?`;
      let history = await dba(sql, [idusers]); // array
      let arr = [];
      sql = `select od.*,p.name,p.image from ordersdetail od join products p on od.products_id = p.idproducts  where orders_id=? and isdeleted = 0`;
      history.forEach((val) => {
        arr.push(dba(sql, [val.idorders]));
      });
      let detail = await Promise.all(arr);
      console.log(detail);
      for (let i = 0; i < history.length; i++) {
        history[i].detail = detail[i];
      }
      return res.status(200).send(history);
    } catch (error) {
      console.error(error);
      return res.status(500).send({ message: "server error" });
    }
  },
  getbanksandAlamat: async (req, res) => {
    try {
      const { idusers } = req.params;
      let sql = `select * from banks`;
      let banks = await dba(sql);
      sql = `select * from alamat where users_id = ?`;
      let alamat = await dba(sql, [idusers]);
      return res.status(200).send({ banks, alamat });
    } catch (error) {
      console.error(error);
      return res.status(500).send({ message: "server error" });
    }
  },
  bayar: (req, res) => {
    try {
      const { idorders } = req.params;
      const path = "/trans"; //ini terserah

      const upload = uploader(path, "Trans").fields([{ name: "bukti" }]);
      upload(req, res, async (err) => {
        if (err) {
          return res
            .status(500)
            .json({ message: "Upload picture failed !", error: err.message });
        }
        console.log("berhasil upload");
        console.log(req.files);
        const { bukti } = req.files;
        const imagePath = bukti ? path + "/" + bukti[0].filename : null;
        console.log(imagePath);
        const data = JSON.parse(req.body.data);
        const dataUpdate = {
          tujuan: data.tujuan,
          bank_id: data.bank_id,
          status: "waitingVerification",
          buktipembayaran: imagePath,
        };
        try {
          let sql = "update orders set ? where idorders = ?";
          await dba(sql, [dataUpdate, idorders]);
          return res.status(200).send({ message: "berhasil" });
        } catch (error) {
          console.log(error);
          if (imagePath) {
            fs.unlinkSync("./public" + imagePath);
          }
          return res.status(500).send({ message: "server error" });
        }
      });
    } catch (error) {
      console.log(error);
      return res.status(500).send({ message: "server error" });
    }
  },
  batal: async (req, res) => {
    try {
      const { idorders } = req.query;
      await dbtransaction();
      let sql = `update orders set ? where idorders = ?`;
      let dataupdate = {
        status: "Cancelled",
      };
      await dba(sql, [dataupdate, idorders]);
      sql = `delete from inventory where orders_id = ?`;
      await dba(sql, [idorders]);
      await dbcommit();
      return res.status(200).send({ message: "berhasil update and delete" });
    } catch (error) {
      await dbrollback();
      console.error(error);
      return res.status(500).send({ message: "server error" });
    }
  },
  getOrders: async (req, res) => {
    const { sort } = req.query;
    let sql = `select o.idorders,o.status,b.name as bank ,u.username, o.expired
    from orders o left join 
    banks b on o.bank_id = b.banks_id
    join users u on o.users_id = u.idusers 
    order by field(o.status,'onCart','waitingVerification','Cancelled')`;
    if (sort === "desc") {
      sql += sort;
    }
    mysqldb.query(sql, (err, result) => {
      if (err) {
        console.log(err);
        return res.status(500).send({ message: "server error" });
      }
      return res.status(200).send(result);
    });
  },
  getWaitingVerification: async (req, res) => {
    try {
      let sql = `select sum(price*qty) as total,idorders,buktipembayaran from ordersdetail od 
      join orders o  on od.orders_id=o.idorders
      where status= 'waitingVerification' and od.isdeleted = 0 
      group by od.orders_id `;
      let orders = await dba(sql);
      return res.status(200).send(orders);
    } catch (error) {
      console.log(error);
      return res.status(500).send({ message: "server error" });
    }
  },
};
