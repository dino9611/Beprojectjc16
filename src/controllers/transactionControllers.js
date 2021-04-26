const { mysqldb } = require("./../connection");
const { promisify } = require("util");
const dba = promisify(mysqldb.query).bind(mysqldb);
const dbtransaction = promisify(mysqldb.beginTransaction).bind(mysqldb);
const dbrollback = promisify(mysqldb.rollback).bind(mysqldb);
const dbcommit = promisify(mysqldb.commit).bind(mysqldb);

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
       where isdeleted= 0 and orders_id = 
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
       where isdeleted= 0 and orders_id = 
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
      sql = `select od.id,p.price from ordersdetail od
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
        console.log(val);
        arr.push(dba(sql, [dataupdate, val.id]));
      });
      await Promise.all(arr);
      await dbcommit();
      sql = `select id,p.* ,sum(i.qty) as stock ,od.qty
            from products p 
            join inventory i on p.idproducts = i.products_id
            join ordersdetail od on p.idproducts = od.products_id 
            where isdeleted= 0 and orders_id = 
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
      let sql = `select * from orders  where status in ('waiting payment') and users_id = ?`;
      let history = await dba(sql, [idusers]); // array
      let arr = [];
      sql = `select od.*,p.name,p.image from ordersdetail od join products p on od.products_id = p.idproducts  where orders_id=?`;
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
};
