import multer from "multer";

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'C:/programming-files/WEB-DEV/chai-code/public/temp')
  },
  filename: function (req, file, cb) {
    cb(null, file.fieldname + '-' + Date.now() + "." + file.mimetype.split('/')[1])
  }
})

export const upload = multer({ storage: storage });