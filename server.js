const express = require('express');
const axios = require('axios');
const crypto = require('crypto');
const app = express();
const router = express.Router();
require('dotenv').config();

const port = process.env.PORT || 3000;
const client_secret = process.env.CLIENT_SECRET
const client_id = process.env.CLIENT_ID
const redirectUrl = 'http://localhost:3000/redirect';
const authorizedUsers = {  };

app.use(router);
router.get('/', (req, res) =>{
    res.json({
        loginUrl: `https://github.com/login/oauth/authorize?client_id=${client_id}&redirect_uri=${redirectUrl}&scope=user repo`
    })
})
const fetchUserProfile = async (accessToken) => {
    return axios({
        method: 'get',
        url: 'https://api.github.com/user',
        headers: {
            Authorization: `token ${accessToken}`
        }
    })
}
router.get('/redirect', async(req, res) =>{
    const { query:{ code } } = req;

    const tokenResponse = await axios({
        method: 'post',
        headers: {
            accept: 'application/json'
        },
        url: 'https://github.com/login/oauth/access_token',
        params: {
            client_id: client_id,
            client_secret: client_secret, 
            code,
        }
    });
    const accessToken = tokenResponse.data.access_token;
    const sessionId = crypto.randomBytes(16).toString('base64');
    authorizedUsers[sessionId] = accessToken;
    res.setHeader('Set-Cookie', `sessid=${sessionId}`);
    res.json({status:'success'});
})
//Create API to get the logged user's profile
app.get('/profile', async function (req, res, next) {
    const cookie = req.headers.cookie;
    const sessionId = cookie.replace('sessid=', '');
    const accessToken = authorizedUsers[sessionId];
    let data;
    try {   
        const response = await fetchUserProfile(accessToken);
        data = response.data;
        res.json(response.data);
    } catch (err) {
        next(err);
    }
    res.json();
});
// Create API to get the logged user's followers
app.get('/followers', async function (req, res, next) {
    const cookie = req.headers.cookie;
    const sessionId = cookie.replace('sessid=', '');
    const accessToken = authorizedUsers[sessionId];
    let data;
    try {   
        const response = await fetchUserProfile(accessToken);
        data = response.data;
        const tokenResponse = await axios({
            method: 'get',
            headers: {
                accept: 'application/json'
            },
            url: data.followers_url,
            params: {
                client_id: client_id, 
                client_secret: client_secret, 
            }
        });
        data = tokenResponse.data;
        res.json(data);
    } catch (err) {
        next(err);
    }
});
// Create API to get the logged user's repos
app.get('/repos', async function (req, res, next) {
    const cookie = req.headers.cookie;
    const sessionId = cookie.replace('sessid=', '');
    const accessToken = authorizedUsers[sessionId];
    let data;
    try {   
        const response = await fetchUserProfile(accessToken);
        data = response.data;
        const tokenResponse = await axios({
            method: 'get',
            headers: {
                accept: 'application/json'
            },
            url: data.repos_url,
            params: {
                client_id: client_id, 
                client_secret: client_secret, 
            }
        });
        data = tokenResponse.data;
        res.json(data);
    } catch (err) {
        next(err);
    }
});
app.listen(port,()=>{
    console.log(`Server running on => http://localhost:${port}`)
})


app.use((error, req, res, next) => {
    if (error.response.data.message === 'Bad credentials') return res.json({
        code: 'UNAUTHORIZED',
        message: 'Please login again'
    });
    res.json(error.response.data);
});