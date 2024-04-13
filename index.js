const express = require('express');
const app = express();
const multer = require('multer');
const XLSX = require('xlsx');
const path = require('path');
var nodemailer = require('nodemailer');
const upload = multer({ dest: 'uploads/' });
const fs = require('fs');
const ejs = require('ejs');
require('dotenv').config()


app.use(express.urlencoded({ extended: true }));
app.set('views', path.join(__dirname, 'views'));
app.set(express.static(path.join(__dirname, 'public')));
app.set('view engine', 'ejs');


// compile templete to use as a mail templete
const emailTemplatePath = path.join(__dirname, 'mailtemplete.ejs');
const emailTemplate = fs.readFileSync(emailTemplatePath, 'utf-8');
// Compile the EJS template
const parse = ejs.compile(emailTemplate);



// Mailer services 

var transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: {
        user: process.env.EMAIL,
        pass: process.env.PASS
    }
});


//   routes
let sub = `Marks`;
let msg = '';
// route to update Email Subject
app.post('/saveSubject', (req, res) => {
    sub = req.body.subject;
    msg = req.body.msg;
    return res.send(`<script>history.go(-1);</script>`)

})

// first index route
app.get('/', (req, res) => {
    return res.render('index.ejs');
});

let jsonData = [];
let keys = '';
let longForm = '';
// uplead file route
app.post('/hello', upload.single('file'), (req, res) => {
    if (!req.file) {
        return res.send(`<script>alert('Please select file'); history.go(-1);</script>`);
    }

    // Access form data
    const formData = req.file.path; // Path to the uploaded file

    // Access other form fields if needed

    // Load the Excel file
    const workbook = XLSX.readFile(path.resolve(formData));
    const sheetName = workbook.SheetNames[0];
    const sheetName2 = workbook.SheetNames[1];
    const worksheet = workbook.Sheets[sheetName];
    const lf = workbook.Sheets[sheetName2]


    // Convert the sheet to JSON
    jsonData = XLSX.utils.sheet_to_json(worksheet);
    longForm = XLSX.utils.sheet_to_json(lf);
    console.log(longForm);

    // getting keys of xcelsheet
    keys = Object.keys(jsonData[0]);

    return res.render('fileData.ejs', { jsonData, keys, sub, msg });


});

// send to Individual
app.get('/:email', (req, res) => {
    let email = req.params.email;
    let data = '';

    for (let i = 0; i < jsonData.length; i++) {
        if (jsonData[i].Email == email) {
            data = jsonData[i];
            break;
        }
    }

    if (data == '') {
        return res.send(`<script>alert('Data Not Found.'); history.go(-1);</script>`);
    }

    // defining mail option
    var mailOptions = {
        from: process.env.EMAIL,
        to: email,
        subject: sub,
        html: parse({ data, keys, msg, longForm }),
    };

    transporter.sendMail(mailOptions, function (error, info) {
        if (error) {
            console.log(error);

            return res.send(`<script>alert('Something went wrong.')</script>`);
        } else {
            return res.send(`<script>alert('Mail sent.'); history.go(-1);</script>`);
        }
    });

});


// send All route
app.post('/sendAll', (req, res) => {
    let mailError = [];
    let mailSent = [];

    for (data of jsonData) {

        var mailOptions = {
            from: process.env.EMAIL,
            to: data.Email, // Ensure that email address is properly set here
            subject: sub,
            html: parse({ data, keys, msg }),
        };

        transporter.sendMail(mailOptions, function (error, info) {
            if (error) {
                mailError.push(data.Email);
            } else {
                mailSent.push(data.Email);
            }
        });
    }

    if (mailError.length >= 1) {
        console.log('error occured at');
        console.log(mailError);
    }

    console.log("send Success");

    return res.send(`<script>alert('Mail Sent to All '); history.go(-1);</script>`);
});



app.listen(80,'0.0.0.0', () => {
    console.log('Server is running on port localhost');
});