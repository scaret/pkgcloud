//..............................................................................
var utile         = require('utile');
var rackspace     = require('../../client');
var StorageClient = require('../../../openstack/storage/storageClient').StorageClient;
var  _            = require('underscore');
//..............................................................................

//..............................................................................
var Client = exports.Client = function (options)
{
    if (options.version === 1 || options.version === '/v1.0') {
        options.useServiceCatalog = false;
    }

    rackspace.Client.call(this, options);

    this.models = {
        Container: require('../../../openstack/storage/container').Container,
        File: require('../../../openstack/storage/file').File
    };

    _.extend(this, require('../../../openstack/storage/client/containers'));
    _.extend(this, require('../../../openstack/storage/client/files'));

  this.serviceType    = 'object-store';
  this.cdnServiceType = 'rax:object-cdn';
};
utile.inherits(Client, rackspace.Client);
_.extend(Client.prototype, StorageClient.prototype);
//..............................................................................

