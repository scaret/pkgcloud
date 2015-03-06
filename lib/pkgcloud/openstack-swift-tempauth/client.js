//..............................................................................
var utile    = require('utile');
var identity = require('./identity');
var base     = require('../openstack/client');
var _        = require('underscore');
//..............................................................................

//..............................................................................
var Client = exports.Client = function (options)
{
  options = options || {};
  options.authUrl = options.authUrl || 'https://';

  options.identity = identity.Identity;

  if (typeof options.useServiceCatalog === 'undefined')
  {
    options.useServiceCatalog = true;
  }

  base.Client.call(this, options);

  this.provider = 'openstack-swift-tempauth';
};
utile.inherits(Client, base.Client);
//..............................................................................

//..............................................................................
Client.prototype._getIdentityOptions = function()
{
  return _.extend
  (
      {
         apiKey: this.config.apiKey
      },
      Client.super_.prototype._getIdentityOptions.call(this)
  );
};
//..............................................................................

//..............................................................................
Client.prototype._request = function (options, callback)
{
    var self = this;
    return Client.super_.prototype._request.call(self, options, callback);
};
//..............................................................................
