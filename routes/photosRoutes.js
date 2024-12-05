const express = require('express');
const router = express.Router(); // suur "R" on oluline
const general = require("../generalFnc");
const multer = require("multer");
const upload = multer({dest: "./public/gallery/orig/"});
const bodyParser = require("body-parser");


//koikidele marsruutidele uhine vahevara
router.use(general.checkLogin);
router.use(bodyParser.urlencoded({extended: true}));

//kontrollerid
const { 
    photosHome,
    uploadPhoto,
    uploadingPhoto,
    galleryOpenPage,
    galleryPage
} = require("../controllers/photosControllers");

//igale marsruudile oma osa nagu seni index failis
router.route("/").get(photosHome);

router.route("/photoupload").get(uploadPhoto);

router.route("/photoupload").post(upload.single("photoInput"), uploadingPhoto);

router.route("/gallery").get(galleryOpenPage);

router.route("/gallery/:page").get(galleryPage);

module.exports = router;