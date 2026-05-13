const express = require('express');
const cookieParser = require('cookie-parser');
// config dotenv
require('dotenv').config();

const server = express();

// * all middlewares

// express-bodyParser
server.use(express.urlencoded({ extended: false }));
// cookie-parser middleware
server.use(cookieParser);

// * end all middlewares
const DEV_PORT = process.env.PORT;
server.listen(DEV_PORT, () => {
  console.log(`server is listening on port:${DEV_PORT}`);
});
