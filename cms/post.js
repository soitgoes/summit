var slugify = require('./services')().slugify;

module.exports = function (app) {
  return app.collection({
    name: 'Post',
    isPostType: true,
    timestamps: true,

    fields: {
      title: 'string',
      body: 'text',
      get slug() {
        return slugify(this.title);
      },
      set slug(newSlug) {
        this.permalink = '/post/' + newSlug;
      }
    },

    design: {
      views: {
        bySlug: {
          map: function (doc) {
            if (doc.collection == 'Post' && doc.slug) {
              emit(doc.slug, doc);
            }
          }
        },
        by_createdAt: {
          map: function(doc){
            if (doc.collection == 'Post'){
              emit(doc.createdAt, null)
            }
          }
        }
      }
    },

    instanceMethods: {
      publish: function () {
        this.published = true;
        return this.save();
      }
    }
  });
}