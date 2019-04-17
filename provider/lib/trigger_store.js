const Promise = require('bluebird')

class TriggerStore {
  constructor (db) {
    this.db = db
  }

  add (trigger) {
    const _insert = Promise.promisify(this.db.insert, {context: this.db})
    return _insert(trigger, trigger.trigger)
  }

  remove (id) {
    id="/" + id;
    const _get = Promise.promisify(this.db.get, {context: this.db})
    const _destroy = Promise.promisify(this.db.destroy, {context: this.db})
    return _get(id).then(doc => _destroy(doc._id, doc._rev)) 
  }

  get (id) {
    id="/" + id;
    const _get = Promise.promisify(this.db.get, {context: this.db})
    return _get(id)
  }

  triggers (url, topic) {
    const key = topic ? `${url}#${topic}` : url
    const _view = Promise.promisify(this.db.view, {context: this.db})
    const extract_triggers = body => body.rows.map(row => row.value)
    return _view('subscriptions', topic ? 'host_topic_triggers' : 'host_triggers', {startkey: key, endkey: key}).then(extract_triggers)
  }

  subscribers () {
    const _view = Promise.promisify(this.db.view, {context: this.db})
    const extract_subscribers = body => body.rows.map(row => { 
      return {trigger: row.key, topic: row.value} 
    })
    return _view('subscriptions', 'all').then(extract_subscribers)
  }
}

module.exports = TriggerStore
