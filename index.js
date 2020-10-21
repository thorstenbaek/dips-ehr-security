const express = require('express');
const cors = require('cors');
const jwt = require('njwt');

const PORT = 80;

var app = express();
app.use(cors());
app.use(express.urlencoded());
app.all("*", function (req, res, next) {  // runs on ALL requests
    req.fullUrl = req.protocol + '://' + req.get('host') + req.originalUrl
        next()
})

app.get("/authorize", (req, res) => {
    console.log("Authorize was called");
    res.redirect(`${req.query.redirect_uri}/?state=${req.query.state}&code=${req.query.launch}`);
});

app.post("/token", (req, res) => {
    console.log("Token was called " + req.fullUrl);    
    
    const claims = 
    { 
        iss: 'dips-ehr-security', 
        sub: 'Fhir authorization token',        
        aud: req.fullUrl,
    }
        
    const token = jwt.create(claims, 'top-secret-phrase', 'HS256')
    token.setExpiration(new Date().getTime() + 60*1000)
    console.log(token.compact());

    var tokenResponse = {
        access_token: token.compact(),
        patient: req.body.code
    };
    
    res.send(tokenResponse)            
});

app.listen(PORT, () => {
    console.log(`Listening on port ${PORT}`);
});

/*
Client credentials flow

+---------------+        +---------------+
|               |        |               |
| Authorization <-(3)----+ SMART         |
| Server        |        | Application   |
|               +-(4)---->               |
|               |        |               |
+---------------+        |               |
                         |               |
+---------------+        |               |
|               |        |               |
|               <-(1)----+               |
| FHIR Resource |        |               |
| Server        +-(2)---->               |
|               |        |               |
|               <-(5)----+               |
|               |        |               |
|               +-(6)---->               |
|               |        |               |
+---------------+        +---------------+

1. The SMART application performs discovery by requesting the FHIR® server’s conformance statement. The mechanism for how the SMART application is provided the URL for the FHIR® server is not defined by this specification.
2. The FHIR® server returns the conformance statement, which provides the needed endpoint for step 3.
3. The SMART application requests an access token using its client credentials.
4. The authorization server returns the access token.
5. The SMART application utilizes the access token to request a FHIR® resource.
6. The FHIR® resource server returns the desired resource.

*/