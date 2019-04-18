/**
 * Module dependencies
 */
var mongoose = require('mongoose');

exports.initialize = function initializeSchema(schema, callback) {
    schema.client = mongoose.connect(schema.settings.url);
    schema.adapter = new MongooseAdapter(schema.client);
};

function MongooseAdapter(client) {
    this._models = {};
    this.client = client;
    this.cache = {};
}

MongooseAdapter.prototype.define = function (descr) {
    var props = {};
    Object.keys(descr.properties).forEach(function (key) {
        props[key] = descr.properties[key].type;
        if (props[key].name === 'Text') props[key] = String;
    });
    var schema = new mongoose.Schema(props);
    this._models[descr.model.modelName] = mongoose.model(descr.model.modelName, schema);
    this.cache[descr.model.modelName] = {};
};

MongooseAdapter.prototype.defineForeignKey = function (model, key, cb) {
    var piece = {};
    piece[key] = {type: mongoose.Schema.ObjectId, index: true};
    this._models[model].schema.add(piece);
    cb(null, String);
};

MongooseAdapter.prototype.setCache = function (model, instance) {
    this.cache[model][instance.id] = instance;
};

MongooseAdapter.prototype.getCached = function (model, id, cb) {
    if (this.cache[model][id]) {
        cb(null, this.cache[model][id]);
    } else {
        this._models[model].findById(id, function (err, instance) {
            if (err) return cb(err);
            this.cache[model][id] = instance;
            cb(null, instance);
        }.bind(this));
    }
};

MongooseAdapter.prototype.create = function (model, data, callback) {
    var m = new this._models[model](data);
    m.save(function (err) {
        callback(err, err ? null : m.id);
    });
};

MongooseAdapter.prototype.save = function (model, data, callback) {
    this.getCached(model, data.id, function (err, inst) {
        if (err) return callback(err);
        merge(inst, data);
        inst.save(callback);
    });
};

MongooseAdapter.prototype.exists = function (model, id, callback) {
    delete this.cache[model][id];
    this.getCached(model, id, function (err, data) {
        if (err) return callback(err);
        callback(err, !!data);
    });
};

MongooseAdapter.prototype.find = function find(model, id, callback) {
    delete this.cache[model][id];
    this.getCached(model, id, function (err, data) {
        if (err) return callback(err);
        callback(err, data);
    });
};

MongooseAdapter.prototype.destroy = function destroy(model, id, callback) {
    this.getCached(model, id, function (err, data) {
        if (err) return callback(err);
        if (data) data.remove(callback);
        else callback(null);
    });
};

MongooseAdapter.prototype.all = function all(model, filter, callback) {
    this._models[model].find(typeof filter === 'function' ? {} : filter, function (err, data) {
        if (err) return callback(err);
        callback(null, data);
    });
};

function applyFilter(filter) {
    if (typeof filter === 'function') {
        return filter;
    }
    var keys = Object.keys(filter);
    return function (obj) {
        var pass = true;
        keys.forEach(function (key) {
            if (!test(filter[key], obj[key])) {
                pass = false;
            }
        });
        return pass;
    }

    function test(example, value) {
        if (typeof value === 'string' && example && example.constructor.name === 'RegExp') {
            return value.match(example);
        }
        // not strict equality
        return example == value;
    }
}

MongooseAdapter.prototype.destroyAll = function destroyAll(model, callback) {
    var wait = 0;
    this._models[model].find(function (err, data) {
        if (err) return callback(err);
        wait = data.length;
        data.forEach(function (obj) {
            obj.remove(done)
        });
    });

    var error = null;
    function done(err) {
        error = error || err;
        if (--wait === 0) {
            callback(error);
        }
    }

};

MongooseAdapter.prototype.count = function count(model, callback) {
    this._models[model].count(callback);
};

MongooseAdapter.prototype.updateAttributes = function updateAttrs(model, id, data, cb) {
    this.getCached(model, id, function (err, inst) {
        if (err) {
            return cb(err);
        } else if (inst) {
            merge(inst, data);
            inst.save(cb);
        } else cb();
    });
};

function merge(base, update) {
    Object.keys(update).forEach(function (key) {
        base[key] = update[key];
    });
    return base;
}

