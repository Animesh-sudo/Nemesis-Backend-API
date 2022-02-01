require('dotenv').config();

const express = require('express');
const cors = require('cors');
const knex = require('knex');
const jwt = require('jsonwebtoken');
const { password } = require('pg/lib/defaults');
//const { database } = require('pg/lib/defaults');

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());

const refreshTokensdb = knex({
  client: 'pg',
  connection: {
    host : '127.0.0.1',
    port : 5432,
    user : 'postgres',
    password : 'webtest',
    database : 'nemisis'
  }
});

refreshTokensdb.select('*').from('jwttokens')
	.then(data => {
		console.log(data)})

//let refreshTokensdb = [];

db = [
    {
        email: 'admin@namasys.co',
        password: 'admin123'
    }
]
app.get('/', authenticateToken, (req,res) => {
    console.log(db.email);
    res.json(db.filter(user => user.email === req.user.email));
})

app.post('/login',(req ,res) =>{
    //Authenticate User
    const { email, password } = req.body;
    if(email === db[0].email && password === db[0].password){
        console.log(email);
        const user = {email: email};

        const accessToken = generateTokonForAccess(user);
        const newToken = jwt.sign(user, process.env.REFRESH_TOKEN_SECRET);
        //refreshTokensdb.push(newToken);
        refreshTokensdb('jwttokens').insert({token: newToken})
        .then(res.json({auth: true, accessToken: accessToken, refreshToken: newToken}))
    } else {
        res.status(400).json({auth: false, message: "token generation failed"})
    }
})

app.get("/isUserAuth", authenticateToken, (req, res) => {
    res.json("You are authenticated");
})

app.post('/token', (req, res) => {
    const refreshToken = req.body.token;
    if (refreshToken == null) { return res.status(401).json('no token found');}
    if (!refreshTokensdb.includes(refreshToken)) { return res.status(401).json('no token found');}
    jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET, (err, user) => {
        if(err) {return res.status(403)}
        const accessToken = generateTokonForAccess({email: user.email})
        res.json( {accessToken: accessToken} )
    })
})

//Middleware

function authenticateToken(req, res, next){
    const token = req.headers['x-access-token'];
    //const token = authHeader && authHeader.split(' ')[1];
    if (token == null) {return res.status(401).json('no token found');}

    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, user) => {
        if(err) {
            return res.status(403).json({auth: false, message: "invalid token"});
        }
        req.user = user;
        console.log(req.user);
        next();
    })
}

function generateTokonForAccess(user){
    return jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '5m'});
}

//Deauthenticating
app.delete('/logout', (req, res)=>{
    refreshTokensdb = refreshTokensdb.filter(token => token !== req.body.token)
    res.status(204);
})

app.post('/register', (req, res) => {
    const { email, name, mobile, address } = req.body;
	if (!email || !name || !mobile || !address ) {
		return res.status(400).json('incorrect form submission');
	}
    refreshTokensdb('userinfo2')
        .returning('*')
        .insert({
            name: name,
            mobile: mobile,
            email: email,
            address: address
        })
        .then(user => {
            res.json(user[0]); //returns array of objects but we only want a object hence user[0]
        })
        .catch(console.log)
})

app.get('/data', (req, res) => {
    refreshTokensdb.select('*').from('userinfo2')
    .returning('*')
	.then(data => {
		res.json(data)})    
})

app.delete('/deldata', (req, res) => {
    const { id } = req.body;
    refreshTokensdb('userinfo2')
        .where('id', id)
        .del()
        .then(res.status(200).json('succesffully deleted the entry'))
        .catch(console.log)
})

app.listen(4000, () => {
	console.log(`app is running on port 4000`);
})