const express = require('express');
const cors = require('cors');
const jwt = require('njwt');

const PORT = process.env.IN_CONTAINER ? 80 : 8000;

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
    console.log("Token was called ");    
    
    const claims = 
    { 
        aud: req.fullUrl,
        fhirUser: "Practitioner/f58db7ee-0c33-43e3-8f91-c33bd9255455",
        iss: 'dips-ehr-security', 
        profile: "Practitioner/f58db7ee-0c33-43e3-8f91-c33bd9255455",
        sub: 'Fhir authorization token',
    }

    const token = jwt.create(claims, 'top-secret-phrase', 'HS256')
    token.setExpiration(new Date().getTime() + 60*1000)    

    let patient = "";
    let encounter = "";
    let resource = "";
    var context = req.body.code;
    if (context.includes(":")) //TODO - replace this hack with JWT containing the real context
    {
        var split = context.split(":");
        if (split.length == 3)
        {
            patient = split[0];
            encounter = split[1];
            resource = split[2];
        }
        else
        {
            patient = split[0]; // always extract patient
        }
    }
    else
    {
        patient = context;    
    }

    var tokenResponse = {
        access_token: token.compact(),        
        id_token: token.compact(),
        client_id: req.body.client_id,
        patient: patient,
        expires_in: 6000,
        encounter: encounter,
        resource: resource,
        scope: "launch launch/patient patient/*.write patient/read offline_access openid fhirUser",
        token_type: "bearer"
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