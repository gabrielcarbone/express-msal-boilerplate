const express = require("express");
const session = require("express-session");
const msal = require("@azure/msal-node");
const url = require("url");

const serverPort = 3000;

const APP_CONFIGS = {
  // app configs
  sessionSecret: `Sz-34v@7@JfYW@Xj8eQ9`,

  //  auth configs
  clientId: process.env.AAD_CLIENT_ID,
  clientSecret: process.env.AAD_CLIENT_SECRET,
  authority: `https://login.microsoftonline.com/${process.env.AAD_TENANT_ID}`,
  redirectUri: "https://localhost:3001/api/auth/login_callback",
  scopes: ["user.read"],
};

const config = {
  auth: {
    clientId: APP_CONFIGS.clientId,
    clientSecret: APP_CONFIGS.clientSecret,
    authority: APP_CONFIGS.authority,
  },
  request: {
    authCodeUrlParameters: {
      scopes: APP_CONFIGS.scopes,
      redirectUri: APP_CONFIGS.redirectUri,
    },
    tokenRequest: {
      scopes: APP_CONFIGS.scopes,
      redirectUri: APP_CONFIGS.redirectUri,
    },
  },
  resourceApi: {
    endpoint: "https://graph.microsoft.com/v1.0/me",
  },
};

const msalInstance = new msal.ConfidentialClientApplication(config);

const app = express();

app.use(
  session({
    secret: APP_CONFIGS.sessionSecret,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: false, // set this to true on production
    },
  })
);

app.use((req, res, next) => {
  const url = req.url;

  if (!req.session.user) {
    // these are allowed calls, the rest will be forbidden
    if (
      url.includes("/api/auth/login") ||
      url.includes("/api/auth/login_callback") ||
      url.includes("/api/auth/logout")
    ) {
      return next();
    }

    return res.sendStatus(401);
  }
  next();
});

app.get("/api/auth/login", (req, res) => {
  if (req.session.user) {
    return res.redirect("/auth/user");
  }

  // if redirectUri is set to the main route "/", redirect to "/redirect" route for handling authZ code
  if (req.query.code)
    return res.redirect(
      url.format({ pathname: "/redirect", query: req.query })
    );

  const { authCodeUrlParameters } = config.request;

  const cryptoProvider = new msal.CryptoProvider();

  if (req.query) {
    // Check for the state parameter
    authCodeUrlParameters.state = req.query.state
      ? req.query.state
      : cryptoProvider.createNewGuid();
    // Check for nonce parameter

    authCodeUrlParameters.nonce = req.query.nonce
      ? req.query.nonce
      : cryptoProvider.createNewGuid();

    // Check for the prompt parameter
    if (req.query.prompt) authCodeUrlParameters.prompt = req.query.prompt;

    // Check for the loginHint parameter
    if (req.query.loginHint)
      authCodeUrlParameters.loginHint = req.query.loginHint;

    // Check for the domainHint parameter
    if (req.query.domainHint)
      authCodeUrlParameters.domainHint = req.query.domainHint;
  }

  req.session.nonce = authCodeUrlParameters.nonce; //switch to a more persistent storage method.
  req.session.state = authCodeUrlParameters.state;

  msalInstance
    .getAuthCodeUrl(authCodeUrlParameters)
    .then((authCodeUrl) => {
      res.redirect(authCodeUrl);
    })
    .catch((error) => res.send(JSON.stringify(error)));
});

app.get("/api/auth/login_callback", (req, res) => {
  const tokenRequest = {
    ...config.request.tokenRequest,
    code: req.query.code,
    state: req.query.state,
  };
  const authCodeResponse = {
    nonce: req.session.nonce,
    code: req.query.code,
    state: req.session.state,
  };

  msalInstance
    .acquireTokenByCode(tokenRequest, authCodeResponse)
    .then((response) => {
      req.session.user = response.account;
      res.redirect("/api/auth/user");
    })
    .catch((error) => {
      console.error(error);
      res.status(500).send(error);
    });
});

app.get("/api/auth/user", (req, res) => {
  res.json(req.session.user);
});

app.get("/api/auth/logout", (req, res) => {
  try {
    req.session.destroy();
  } catch (err) {
    console.error(err);
  }

  res.sendStatus(200);
});

app.listen(serverPort, () =>
  console.log(`Msal Node Auth Code Sample app listening on port ${serverPort}!`)
);
