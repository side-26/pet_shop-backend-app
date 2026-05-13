const express = require("express");
const cookieParser = require("cookie-parser");
// config dotenv
require("dotenv").config();

const server = express();

// * all middlewares

// express-bodyParser
server.use(express.urlencoded({ extended: false }));
// cookie-parser middleware
server.use(cookieParser);

// * end all middlewares
const devPort = process.env.PORT;
server.listen(devPort, () => {
  console.log(`server is listening on port:${devPort}`);
});
