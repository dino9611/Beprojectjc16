const { mysqldb } = require("./../connection");

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
                sql = `select p.*,qty from ordersdetail od join products p on od.products_id = p.idproducts  
                        where isdeleted= 0 and orders_id = 
                        (select idorders from orders 
                        where status = 'onCart' 
                        and users_id = ?);`;
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
              sql = `select p.*,qty from ordersdetail od join products p on od.products_id = p.idproducts  
                where isdeleted= 0 and orders_id = 
                (select idorders from orders 
                where status = 'onCart' 
                and users_id = ?);`;
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
                sql = `select p.*,qty from ordersdetail od join products p on od.products_id = p.idproducts  
                where isdeleted= 0 and orders_id = 
                (select idorders from orders 
                where status = 'onCart' 
                and users_id = ?);`;
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
};
