//..............................................................................
var identity = require('../../openstack/context');
var events   = require('eventemitter2');
var Identity = identity.Identity;
var util     = require('util'    );
var urlJoin  = require('url-join');
var request  = require('request' );
var url      = require('url'     );
//..............................................................................

//..............................................................................
exports.Identity = CxqIdentity = function (options)
{
    console.log('cxq-identity:',options)
    this.options = options;
    this.name = 'CxqIdentity';

    this.useServiceCatalog = (typeof options.useServiceCatalog === 'boolean')
      ? options.useServiceCatalog
      : true;

    events.EventEmitter2.call(this, { delimiter: '::', wildcard: true });
};
//..............................................................................

//..............................................................................
util.inherits(CxqIdentity, events.EventEmitter2);
util.inherits(CxqIdentity, Identity);
//..............................................................................

//..............................................................................
var extractAuthorizationFromResponse = function (identity, res)
{
    identity.token = {};
  //console.log('extractAuthorizationFromResponse token:',identity.token);
  //console.log('extractAuthorizationFromResponse headers:',res.headers);

    if (!res)
    {
        throw new Error('missing required arguments!');
    }

    var xExpires = res.headers['x-auth-token-expires'];
    var xToken   = res.headers['x-auth-token'        ];
    var xUrl     = res.headers['x-storage-url'       ];

    // Some strange behaviour from swauth.
    // If the client is outside the firewall such as: http://180.166.107.53:8090
    // then the x-storage-url header will have the local url instead of the global.
    // So will get http://10.12.5.10 etc.
    // Long term this is not an issue since we will only access the system from
    // inside the firewall, but is a problem for Mesheven debug access.

    var urlObject   = url.parse(xUrl);
    var urlOriginal = url.parse(identity.options.url);

  //console.log('urlObject  :',urlObject);
  //console.log('urlOriginal:',urlOriginal);
  //console.log('urlString  :',url.format(urlObject));

    urlObject.host = urlOriginal.host;
  //console.log('urlNew     :',url.format(urlObject));
    xUrl = url.format(urlObject);

  //console.log('originalUrl:' + identity.options.url);

    if (isDefined(xToken))
    {
        identity.token.id = xToken;
    }

    if (isDefined(xExpires))
    {
        identity.token.expires = new Date(xExpires);
    }
    else
    {
        identity.token.expires = cxq.util.meshNow();
        identity.token.expires = cxq.util.addMinutes(identity.token.expires,60); //assume token will be good for 1 hour
    }

    identity.useServiceCatalog = false;
    identity.options.url = xUrl;

    identity.user = res.req._headers['x-auth-user'];
    identity.raw  = res;

  //console.log('CxqIdentity.token:', identity.token);
};
//..............................................................................

//..............................................................................
var failCodes =
{
    400: 'Bad Request',
    401: 'Unauthorized',
    403: 'Resize not allowed',
    404: 'Item not found',
    405: 'Bad Method',
    409: 'Build in progress',
    413: 'Over Limit',
    415: 'Bad Media Type',
    500: 'Fault',
    503: 'Service Unavailable'
};
//..............................................................................

//..............................................................................
function extractErrorFromResponse(err, res, body)
{
    if (err)
    {
        return err;
    }

    var statusCode = res.statusCode.toString();
    var err2;

    var failCode = failCodes[res.statusCode.toString()];
    if (failCode)
    {
        err2 =
        {
            failCode   : failCode,
            statusCode : res.statusCode,
            message    : 'Error (' + statusCode + '): ' + failCodes[statusCode],
            href       : res.request.uri.href,
            method     : res.request.method,
            headers    : res.headers
        };

        try
        {
            err2.result = typeof body === 'string' ? JSON.parse(body) : body;
        }
        catch (e)
        {
            err2.result = { err: body };
        }

        return err2;
    }

    return;
}
//..............................................................................

//..............................................................................
CxqIdentity.prototype.authorize = function (options, callback)
{
    var self = this;
    //..........................................................................
    //console.log('Intercept CxqIdentity.prototype.authorize:',self.options);
    if (typeof options === 'function')
    {
        callback = options;
        options = {};
    }
    //..........................................................................
    var callback_Request = function (err, response, body)
    {
        //console.log('CxqIdentity.authorize:request.callback');
        //console.log('err            :',err);
        //console.log('statusCode     :',response.statusCode);
        //console.log('responseHeaders:',response.headers);
        //console.log('requestHeaders :',response.req._headers);
        //console.log('body           :',body);
      //cxq.util.saveDataToJSON_DebugSync(response,'CxqIdentity.response');

        var err2 = extractErrorFromResponse(err, response, body);
        if (err2)
        {
            console.log('CxqIdentity.authorize.error:',err2);
            callback(err2);
        }

        if (response)
        {
            self.emit
            (
                'log::trace', 'Provider Authentication Response',
                {
                    href      : response.request.uri.href,
                    method    : response.request.method,
                    headers   : response.headers,
                    statusCode: response.statusCode
                }
            );
        }

        try
        {
            extractAuthorizationFromResponse(self, response);
            callback();
        }
        catch (e)
        {
            console.log('extractAuthorizationFromResponse error:',e);
            callback(e);
        }
    };
    ////////////////////////////////////////////////////////////////////////////

    var urlObject = url.parse(self.options.url);
    urlObject.pathname = '/auth/v1.0';
    var uri = url.format(urlObject);

    var authenticationOptions =
    {
        uri    : uri,
        method : 'GET',
        headers:
        {
            'User-Agent'   : 'mesh-core-01',
            'Content-Type' : 'application/json',
            'Accept'       : 'application/json',
            'X-Auth-User'  : self.options.username,
            'X-Auth-Key'   : self.options.password
        }
    };
    //console.log('CxqIdentity.authorize:',authenticationOptions);
    request(authenticationOptions, callback_Request);
};
//..............................................................................