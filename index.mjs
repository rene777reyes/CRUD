import express from 'express';
import mysql from 'mysql2/promise';
import bcrypt from 'bcrypt';
import session from 'express-session';

const app = express();

//session configuration
app.set('trust proxy', 1) // trust first proxy
app.use(session({
  secret: 'cst336 csumb',
  resave: false,
  saveUninitialized: true
//   cookie: { secure: true }  //only works in web servers
}))

app.set('view engine', 'ejs');
app.use(express.static('public'));

//for Express to get values using POST method
app.use(express.urlencoded({extended:true}));

//setting up database connection pool
const pool = mysql.createPool({
    host: "q68u8b2buodpme2n.cbetxkdyhwsb.us-east-1.rds.amazonaws.com",
    user: "xl4jx4dujap92wk3",
    password: "p9wkm8o141l7i9z0",
    database: "q7umu6ct1r9qcxua",
    connectionLimit: 10,
    waitForConnections: true
});

//routes
app.get('/', (req, res) => {
   res.render('login.ejs');
});

app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/');
});
 
app.get('/profile', isUserAuthenticated, (req, res) => {
     res.render('profile.ejs')
});

app.post('/loginProcess', async (req, res) => {
     let username = req.body.username;
     let password = req.body.password;
 
     let hashedPassword = "";
     let sql = `SELECT *
                FROM users
               WHERE username = ?`;
     const [rows] = await pool.query(sql, [username]); 
 
     if (rows.length > 0) { //username exists in the table
       hashedPassword = rows[0].password;
     }
 
     const match = await bcrypt.compare(password, hashedPassword);
 
     if (match) {
         req.session.isUserAuthenticated = true;
         req.session.fullName = rows[0].firstName + " " + rows[0].lastName;
         res.render('home.ejs')
     } else {
         res.render('login.ejs', {"loginError": "Wrong Credentials" })
     } 
});

function isUserAuthenticated(req, res, next){
    if (req.session.isUserAuthenticated) {
        next();
      } else {
        res.redirect("/");
      }
}

app.get('/author/new', (req, res) => {
    res.render('addAuthor.ejs');
});

app.get('/quote/new', async (req, res) => {
    let sql = `SELECT *
               FROM q_authors
               ORDER BY lastName`;
    const [rows] = await pool.query(sql);

    let sql2 = `SELECT DISTINCT category
               FROM q_quotes`;
    const [rows2] = await pool.query(sql2);
    res.render("addQuote.ejs", {"authors":rows, "categories": rows2});
});

app.post('/author/new', async (req, res) => {
    let firstName = req.body.fn;
    let lastName = req.body.ln;
    let birthDay = req.body.bd;
    let deathDay = req.body.dd;
    let birthPlace = req.body.bp;
    let sex = req.body.sex;
    let profession = req.body.prof;
    let portraitURL = req.body.port;
    let bio = req.body.bio;
    let sql = `INSERT INTO q_authors
                    (firstName, lastName, dob, dod, country, sex, profession, portrait, biography)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;
    let sqlParams = [firstName, lastName, birthDay, deathDay, birthPlace, sex,
                        profession, portraitURL, bio
    ];
    const [rows] = await pool.query(sql, sqlParams)
    res.render('addAuthor.ejs', {"message": "Author added!"});
});

app.get("/authors", async function(req, res){
    let sql = `SELECT *
               FROM q_authors
               ORDER BY lastName`;
    const [rows] = await pool.query(sql);
    res.render("authorList.ejs", {"authors":rows});
});

app.get("/quotes", async function(req, res){
    let sql = `SELECT *
               FROM q_quotes
               ORDER BY quoteId`;
    const [rows] = await pool.query(sql);
    res.render("quoteList.ejs", {"quotes":rows});
});


app.get("/author/edit", async function(req, res){
    let authorId = req.query.authorId;
    let sql = `SELECT *, 
           DATE_FORMAT(dob, '%Y-%m-%d') dobISO,
           DATE_FORMAT(dod, '%Y-%m-%d') dodISO
           FROM q_authors
           WHERE authorId =  ${authorId}`;
    const [rows] = await pool.query(sql);
    res.render("editAuthor.ejs", {"authorInfo":rows});
});

app.get("/quote/edit", async function(req, res){
    let quoteId = req.query.quoteId;
    let sql = `SELECT *
           FROM q_quotes
           WHERE authorId =  ${quoteId}`;
    const [rows] = await pool.query(sql);
    res.render("editQuote.ejs", {"quoteInfo":rows});
});

app.post("/author/edit", async function(req, res){
    let authorId = req.body.authorId;
    let firstName = req.body.fn;
    let lastName = req.body.ln;
    let birthDay = req.body.bd;
    let deathDay = req.body.dd;
    let birthPlace = req.body.bp;
    let sex = req.body.sex;
    let profession = req.body.prof;
    let portraitURL = req.body.port;
    let bio = req.body.bio;

    let sql = `UPDATE q_authors
              SET firstName = ?,
                  lastName = ?,
                  dob = ?,
                  dod = ?,
                  country = ?,
                  sex = ?,
                  profession = ?,
                  portrait = ?,
                  biography = ?
              WHERE authorId =  ?`;
    let params = [firstName, lastName, birthDay, deathDay, birthPlace, sex,
        profession, portraitURL, bio, authorId];         
    const [rows] = await pool.query(sql, params);
    res.redirect("/authors");
});


app.post("/quote/edit", async function(req, res){
    let quoteId = req.body.quoteId;
    let quote = req.body.quote;
    let category = req.body.category;
    let likes = req.body.likes;
    let authorId = req.body.authorId;

    let sql = `UPDATE q_quotes
              SET quote = ?,
                  authorId = ?,
                  category = ?,
                  likes = ?
              WHERE quoteId =  ?`;
    let params = [quote, authorId, category, likes, quoteId];         
    const [rows] = await pool.query(sql, params);
    res.redirect("/quotes");
});

app.get("/author/delete", async function(req, res){

    let authorId = req.query.authorId;
    let sql = `DELETE 
               FROM q_authors
               WHERE authorId = ?`;
    const [rows] = await pool.query(sql, [authorId]);

    res.redirect("/authors");
});

app.get("/quote/delete", async function(req, res){

    let quoteId = req.query.quoteId;
    let sql = `DELETE 
               FROM q_quotes
               WHERE quoteId = ?`;
    const [rows] = await pool.query(sql, [quoteId]);

    res.redirect("/quotes");
});
  
   
   


app.get("/dbTest", async(req, res) => {
   try {
        const [rows] = await pool.query("SELECT CURDATE()");
        res.send(rows);
    } catch (err) {
        console.error("Database error:", err);
        res.status(500).send("Database error!");
    }
});//dbTest

app.listen(3000, ()=>{
    console.log("Express server running")
})