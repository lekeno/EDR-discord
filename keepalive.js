"use strict";
const express = require('express');
const http = require("https");

module.exports = class KeepAlive {
  constructor () {
    this.app = express();
  }

  setup() {
    this.app.get("/", (request, response) => {
      response.sendStatus(200);
    });
    
    this.app.listen(process.env.PORT);
    setInterval(() => {
      https.get(process.env.HOST);
    }, 280000);
  }
}