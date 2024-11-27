const express = require('express');
const router = express.Router(); // suur "R" on oluline
const general = require("../generalFnc");

//koikidele marsruutidele uhine vahevara
router.use(general.checkLogin);

//kontrollerid
const { 
    photosHome,
    uploadPhoto,
    uploadingPhoto,
    gallery
} = require("../controllers/photosControllers");

//igale marsruudile oma osa nagu seni index failis
router.route("/").get(photosHome);

router.route("/photoupload").get(uploadPhoto);

router.route("/photoupload").post(uploadingPhoto);

router.route("/gallery").get(gallery);

module.exports = router;