/**
 * Dependencies
 */
var i8n = require('inflection');
var defineScope = require('./scope.js').defineScope;
var ModelBaseClass = require('./model.js');

module.exports = Relation;

function Relation() {
}

Relation.relationNameFor = function relationNameFor(foreignKey) {
    for (var rel in this.relations) {
        if (this.relations[rel].type === 'belongsTo' && this.relations[rel].keyFrom === foreignKey) {
            return rel;
        }
    }
};

/**
 * Declare hasMany relation
 *
 * @param {Relation} anotherClass - class to has many
 * @param {Object} params - configuration {as:, foreignKey:}
 * @example `User.hasMany(Post, {as: 'posts', foreignKey: 'authorId'});`
 */
Relation.hasMany = function hasMany(anotherClass, params) {
    var thisClassName = this.modelName;
    params = params || {};
    if (typeof anotherClass === 'string') {
        params.as = anotherClass;
        if (params.model) {
            anotherClass = params.model;
        } else {
            var anotherClassName = i8n.singularize(anotherClass).toLowerCase();
            for(var name in this.dataSource.modelBuilder.models) {
                if (name.toLowerCase() === anotherClassName) {
                    anotherClass = this.dataSource.modelBuilder.models[name];
                }
            }
        }
    }
    var methodName = params.as || i8n.camelize(anotherClass.pluralModelName, true);
    var fk = params.foreignKey || i8n.camelize(thisClassName + '_id', true);

    var idName = this.dataSource.idName(this.modelName) || 'id';

    this.relations[methodName] = {
        type: 'hasMany',
        keyFrom: idName,
        keyTo: fk,
        modelTo: anotherClass,
        multiple: true
    };
    // each instance of this class should have method named
    // pluralize(anotherClass.modelName)
    // which is actually just anotherClass.find({where: {thisModelNameId: this[idName]}}, cb);
    var scopeMethods = {
        findById: find,
        destroy: destroy
    };
    if (params.through) {
        var fk2 = i8n.camelize(anotherClass.modelName + '_id', true);
        scopeMethods.create = function create(data, done) {
            if (typeof data !== 'object') {
                done = data;
                data = {};
            }
            if ('function' !== typeof done) {
                done = function() {};
            }
            var self = this;
            anotherClass.create(data, function(err, ac) {
                if (err) return done(err, ac);
                var d = {};
                d[params.through.relationNameFor(fk)] = self;
                d[params.through.relationNameFor(fk2)] = ac;
                params.through.create(d, function(e) {
                    if (e) {
                        ac.destroy(function() {
                            done(e);
                        });
                    } else {
                        done(err, ac);
                    }
                });
            });
        };
        scopeMethods.add = function(acInst, done) {
            var data = {};
            var query = {};
            query[fk] = this[idName];
            data[params.through.relationNameFor(fk)] = this;
            query[fk2] = acInst[idName] || acInst;
            data[params.through.relationNameFor(fk2)] = acInst;
            params.through.findOrCreate({where: query}, data, done);
        };
        scopeMethods.remove = function(acInst, done) {
            var q = {};
            q[fk2] = acInst[idName] || acInst;
            params.through.findOne({where: q}, function(err, d) {
                if (err) {
                    return done(err);
                }
                if (!d) {
                    return done();
                }
                d.destroy(done);
            });
        };
        delete scopeMethods.destroy;
    }
    defineScope(this.prototype, params.through || anotherClass, methodName, function () {
        var filter = {};
        filter.where = {};
        filter.where[fk] = this[idName];
        if (params.through) {
            filter.collect = i8n.camelize(anotherClass.modelName, true);
            filter.include = filter.collect;
        }
        return filter;
    }, scopeMethods);

    if (!params.through) {
        // obviously, anotherClass should have attribute called `fk`
        anotherClass.dataSource.defineForeignKey(anotherClass.modelName, fk, this.modelName);
    }

    function find(id, cb) {
        anotherClass.findById(id, function (err, inst) {
            if (err) return cb(err);
            if (!inst) return cb(new Error('Not found'));
            if (inst[fk] && inst[fk].toString() == this[idName].toString()) {
                cb(null, inst);
            } else {
                cb(new Error('Permission denied'));
            }
        }.bind(this));
    }

    function destroy(id, cb) {
        var self = this;
        anotherClass.findById(id, function (err, inst) {
            if (err) return cb(err);
            if (!inst) return cb(new Error('Not found'));
            if (inst[fk] && inst[fk].toString() == self[idName].toString()) {
                inst.destroy(cb);
            } else {
                cb(new Error('Permission denied'));
            }
        });
    }

};

/**
 * Declare belongsTo relation
 *
 * @param {Class} anotherClass - class to belong
 * @param {Object} params - configuration {as: 'propertyName', foreignKey: 'keyName'}
 *
 * **Usage examples**
 * Suppose model Post have a *belongsTo* relationship with User (the author of the post). You could declare it this way:
 * Post.belongsTo(User, {as: 'author', foreignKey: 'userId'});
 *
 * When a post is loaded, you can load the related author with:
 * post.author(function(err, user) {
 *     // the user variable is your user object
 * });
 *
 * The related object is cached, so if later you try to get again the author, no additional request will be made.
 * But there is an optional boolean parameter in first position that set whether or not you want to reload the cache:
 * post.author(true, function(err, user) {
 *     // The user is reloaded, even if it was already cached.
 * });
 *
 * This optional parameter default value is false, so the related object will be loaded from cache if available.
 */
Relation.belongsTo = function (anotherClass, params) {
    params = params || {};
    if ('string' === typeof anotherClass) {
        params.as = anotherClass;
        if (params.model) {
            anotherClass = params.model;
        } else {
            var anotherClassName = anotherClass.toLowerCase();
            for(var name in this.dataSource.modelBuilder.models) {
                if (name.toLowerCase() === anotherClassName) {
                    anotherClass = this.dataSource.modelBuilder.models[name];
                }
            }
        }
    }

    var idName = this.dataSource.idName(anotherClass.modelName) || 'id';
    var methodName = params.as || i8n.camelize(anotherClass.modelName, true);
    var fk = params.foreignKey || methodName + 'Id';

    this.relations[methodName] = {
        type: 'belongsTo',
        keyFrom: fk,
        keyTo: idName,
        modelTo: anotherClass,
        multiple: false
    };

    this.dataSource.defineForeignKey(this.modelName, fk, anotherClass.modelName);
    this.prototype['__finders__'] = this.prototype['__finders__'] || {};

    this.prototype['__finders__'][methodName] = function (id, cb) {
        if (id === null) {
            cb(null, null);
            return;
        }
        anotherClass.findById(id, function (err,inst) {
            if (err) return cb(err);
            if (!inst) return cb(null, null);
            if (inst[idName] === this[fk]) {
                cb(null, inst);
            } else {
                cb(new Error('Permission denied'));
            }
        }.bind(this));
    };

    this.prototype[methodName] = function (refresh, p) {
        if (arguments.length === 1) {
            p = refresh;
            refresh = false;
        } else if (arguments.length > 2) {
            throw new Error('Method can\'t be called with more than two arguments');
        }
        var self = this;
        var cachedValue;
        if (!refresh && this.__cachedRelations && (typeof this.__cachedRelations[methodName] !== 'undefined')) {
            cachedValue = this.__cachedRelations[methodName];
        }
        if (p instanceof ModelBaseClass) { // acts as setter
            this[fk] = p[idName];
            this.__cachedRelations[methodName] = p;
        } else if (typeof p === 'function') { // acts as async getter
            if (typeof cachedValue === 'undefined') {
                this.__finders__[methodName].apply(self, [this[fk], function(err, inst) {
                    if (!err) {
                        self.__cachedRelations[methodName] = inst;
                    }
                    p(err, inst);
                }]);
                return this[fk];
            } else {
                p(null, cachedValue);
                return cachedValue;
            }
        } else if (typeof p === 'undefined') { // acts as sync getter
            return this[fk];
        } else { // setter
            this[fk] = p;
            delete this.__cachedRelations[methodName];
        }
    };

};

/**
 * Many-to-many relation
 *
 * Post.hasAndBelongsToMany('tags'); creates connection model 'PostTag'
 */
Relation.hasAndBelongsToMany = function hasAndBelongsToMany(anotherClass, params) {
    params = params || {};
    var models = this.dataSource.modelBuilder.models;

    if ('string' === typeof anotherClass) {
        params.as = anotherClass;
        if (params.model) {
            anotherClass = params.model;
        } else {
            anotherClass = lookupModel(i8n.singularize(anotherClass)) ||
                anotherClass;
        }
        if (typeof anotherClass === 'string') {
            throw new Error('Could not find "' + anotherClass + '" relation for ' + this.modelName);
        }
    }

    if (!params.through) {
        var name1 = this.modelName + anotherClass.modelName;
        var name2 = anotherClass.modelName + this.modelName;
        params.through = lookupModel(name1) || lookupModel(name2) ||
            this.dataSource.define(name1);
    }
    params.through.belongsTo(this);
    params.through.belongsTo(anotherClass);

    this.hasMany(anotherClass, {as: params.as, through: params.through});

    function lookupModel(modelName) {
        var lookupClassName = modelName.toLowerCase();
        for (var name in models) {
            if (name.toLowerCase() === lookupClassName) {
                return models[name];
            }
        }
    }

};
