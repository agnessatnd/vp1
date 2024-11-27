const mysql = require("mysql2");
const dbInfo = require("../../../vp2024_config.js");
const multer = require("multer");
const sharp = require("sharp");

const upload = multer({dest: "../public/gallery/orig/"});

const conn = mysql.createConnection({
    host: dbInfo.configData.host,
    user: dbInfo.configData.user,
    password: dbInfo.configData.password,
    database: dbInfo.configData.database
});

// @desc home page for photos section
// @route GET /photos
// @accsess private
const photosHome = (req, res) => {
    res.render("photosindex");
};

// @desc page for uploading photos
// @route GET /photos/photoupload
// @accsess private
const uploadPhoto = (req, res) => {
    let notice = "";

    res.render("photoupload", { notice });
};

// @desc uploading photos
// @route POST /photos/photoupload
// @accsess private

const uploadingPhoto = (upload.single("photoInput"), (req, res) => {
    let notice = "";
    console.log("req body: " + req.body);
    console.log("req fail: " + req.file);
    //genereerime oma failinime
    const fileName = "vp_" + Date.now() + ".jpg";
    const user_id = req.session.userId;

    if (!user_id) {
        notice = "Kasutaja pole sisse logitud!";
        return res.render("photoupload", { notice });
    }
    //nimetame uleslaetud faili umber
    if (!req.file) {
        notice = "Pildifail on sisestamata!";
        return res.render("photoupload", { notice });
    }
    fs.rename(req.file.path, req.file.destination + fileName,(err)=>{
        console.log(err);

    });
    //teeme pildi kahes erisuuruses
    sharp(req.file.destination + fileName).resize(800,600).jpeg({quality: 90}).toFile("../public/gallery/normal/" + fileName);
    sharp(req.file.destination + fileName).resize(100,100).jpeg({quality: 90}).toFile("../public/gallery/thumb/" + fileName);
    //salvestame andmebaasi
    let sqlReq = "INSERT INTO vp1_photos (file_name, orig_name, alt_text, privacy, user_id) VALUES (?, ?, ?, ?, ?)";

    conn.query(sqlReq, [fileName, req.file.originalname, req.body.altInput, req.body.privacyInput, user_id], (err, result)=>{
        if(err) {
            throw err;
        }
        else {
            notice = "Pilt laeti üles!";
            res.render("photoupload", { notice });
        }
    });
});

// @desc page for gallery
// @route GET /photos/gallery
// @accsess private
const gallery = (req, res) => {

    let sqlReq = "SELECT id, file_name, alt_text FROM vp1_photos WHERE privacy = ? AND deleted IS NULL ORDER BY id DESC;"
    const privacy = 3;
    let photoList = [];
    conn.execute(sqlReq, [privacy], (err, results) => {
        if (err) {
            throw err;
        }
        else{
            for(let i = 0; i < results.length; i++){
                photoList.push({id: results[i].id, href: "/gallery/thumb/", filename: results[i].file_name, alt: results[i].alt_text});
            }
            res.render("gallery", { listData: photoList });
        }
    });
};

module.exports = {
    photosHome,
    uploadPhoto,
    uploadingPhoto,
    gallery
};