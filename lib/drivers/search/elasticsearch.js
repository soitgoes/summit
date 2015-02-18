var elasticsearch = require('elasticsearch')
  , Promise = require('bluebird');

module.exports = function (db, config) {
  var client = new elasticsearch.Client({
    host: config.search.host + ':' + config.search.port,
    log: 'trace'
  });

  var doSearch = Promise.promisify(client.search);

  return function search (opts) {
    var matchField = opts.exact === false ? 'term' : 'match';
    var collection = opts.collection;
    var query = opts.query;

    delete opts.collection;
    delete opts.exact;
    delete opts.fields;

    var esQuery = {
      filtered: {
        query: {},
        filter: {}
      }
    };

    if (!collection) {
      delete esQuery.filtered.filter;
    }
    else if (typeof collection === 'string') {
      esQuery.filtered.filter = {query:{match:{collection: collection}}};
    }
    else { // Must be an array
      esQuery.filtered.filter.and = collection.map(function (filteredCollection) {
        return {match_all: {collection: filteredCollection}};
      });
    }

    if (_.isArray(opts)) {
      return Promise.all(opts.map(search));
    }

    // Simple query
    if (typeof opts.query === 'string') {
      esQuery.filtered.query.query_string = {query: opts, phrase_slop: 3};
      return doSearch({query: esQuery});
    }

    if (_.isArray(opts.query)) {
     return Promise.all(opts.map(function (q) {
      return search(_.extend({}, opts, {query: q}));
     }));
    }

    // Raw query
    if (typeof opts.query === 'object') {
      return doSearch(opts.query);
    }

    esQuery.filtered.query[matchField] = opts;

    if (opts.size) {
      esQuery.size = opts.size;
    }

    if (opts.page) {
      esQuery.size = esQuery.size || 10;
      esQuery.from = esQuery.size * (opts.page - 1);
    }

    return doSearch({
      index: this.config.name,
      type: this.config.name,
      body: {query: esQuery}
    });
  };
};