const express = require('express');
const router = express.Router(); // suur "R" on oluline
const general = require("../generalFnc");

//koikidele marsruutidele uhine vahevara
router.use(general.checkLogin);

//kontrollerid
const { 
    newsHome,
    addNews,
    addingNews,
    newsHeadings
} = require("../controllers/newsControllers");

//igale marsruudile oma osa nagu seni index failis

//app.get("/news", checkLogin, (req, res) => {
router.route("/").get(newsHome);

router.route("/addnews").get(addNews);

router.route("/addnews").post(addingNews);

router.route("/readnews").get(newsHeadings);

module.exports = router;