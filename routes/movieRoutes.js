const express = require('express');
const router = express.Router(); // suur "R" on oluline
const general = require("../generalFnc");

//koikidele marsruutidele uhine vahevara
router.use(general.checkLogin);

//kontrollerid
const { 
    movieHome,
    personInMovie,
    addRelations,
    addingRelations,
    movieDataDB,
    personData,
    addingPersonData,
    movieData,
    addingMovieData,
    positionData,
    addingPositionData
} = require("../controllers/movieControllers");

//igale marsruudile oma osa nagu seni index failis
router.route("/").get(movieHome);

router.route("/tegelased").get(personInMovie);

router.route("/addRelations").get(addRelations);

router.route("/addRelations").post(addingRelations);

router.route("/moviedatadb").get(movieDataDB);

router.route("/moviedatadb").get(personData);

router.route("/moviedatadb").post(addingPersonData);

router.route("/moviedatadb").get(movieData);

router.route("/moviedatadb").post(addingMovieData);

router.route("/moviedatadb").get(positionData);

router.route("/moviedatadb").post(addingPositionData);

module.exports = router;