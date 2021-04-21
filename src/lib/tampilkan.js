const fs = require("fs");
module.exports = (path) => {
  return new Promise((resolve, reject) => {
    fs.readFile(path, "utf-8", (err, datas) => {
      if (err) {
        reject("ini error");
      } else {
        resolve(datas);
      }
    });
  });
};
